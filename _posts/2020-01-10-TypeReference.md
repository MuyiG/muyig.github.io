---
layout: post
title: fastjson TypeReference 揭秘
description: ""
categories: [Java]
tags: [fastjson, reflection]
---

* Kramdown table of contents
{:toc .toc}

# 一、前言
先来看一个开发中经常遇到的问题。

使用 fastjson 反序列化一个泛型类时，比如下面的代码：

```java
String userString = "[{\"userId\":\"111\",\"userName\":\"Tom\"},{\"userId\":\"222\",\"userName\":\"Jerry\"}]";
List<UserInfo> input = new ArrayList<>();
List<UserInfo> userInfoList = JSON.parseObject(userString, input.getClass());
```

执行时会发现反序列化出来的列表元素的是 JSONObject，而不是期望的 UserInfo：

![JSONObject]({{ site.baseurl }}/assets/images/posts/typereference/1.png)

并且在之后尝试使用时报错：`java.lang.ClassCastException: com.alibaba.fastjson.JSONObject cannot be cast to com.vdian.dagon.core.user.UserInfo`

这个也不难理解，因为Java的泛型在运行时已经擦除了类型，运行时拿到的只是一个 List，fastjson 也不知道应该把里面的元素反序列化为什么类型，只好转为 JSONObject。

为了处理这种问题，fastjson提供了 TypeReference，一个用于处理泛型反序列化的类。

参考官方 [Wiki](https://github.com/alibaba/fastjson/wiki/TypeReference) 的说明，我们按照下面的写法，就反序列化成功了：

```java
List<UserInfo> userInfoList = JSON.parseObject(userString, new TypeReference<List<UserInfo>>() {});
```

# 二、TypeReference 揭秘

去看方法的实现，发现就是直接取出 `TypeReference` 里的成员变量 `type`，然后正常执行反序列化：

```java
@SuppressWarnings("unchecked")
public static <T> T parseObject(String text, TypeReference<T> type, Feature... features) {
    return (T) parseObject(text, type.type, ParserConfig.global, DEFAULT_PARSER_FEATURE, features);
}
```

那么 `TypeReference` 怎么可以绕过 Java 的类型擦除机制，获取到泛型的真实类型呢？接下来一步步分析一下。

## 1.匿名内部子类

首先是这个不常见的用法：`new TypeReference<List<UserInfo>>() {}`，看起来有点奇怪。

先来看一下我们比较熟悉的另一种语法，如下代码的作用是创建一个实现了 `Runnable` 接口的匿名内部类实例，必须实现接口定义的方法：

```java
new Runnable() {
    @Override
    public void run() {
        // ...
    }
};
```

对于抽象类也可以通过这种方式来创建匿名内部子类的实例，必须实现抽象方法：

```java
new AbstractList<String>() {
    @Override
    public int size() {
        return 0;
    }

    @Override
    public String get(int index) {
        return null;
    }
};
```

把这种写法用在一个非抽象类上，就创建了一个匿名内部子类实例了：

```java
new ArrayList<String>() {
    // 因为父类非抽象，因此不需要实现任何方法（当然如果想重写也是可以的）
};
```

然后把格式调整一下，就成了上面的写法： `new TypeReference<List<UserInfo>>() {}`。

所以我们其实并不是创建了一个 `TypeReference` 实例，而是创建了一个它的匿名内部子类的实例。另外，仔细看会发现 `TypeReference` 并没有公开的构造方法，所有的构造方法都是 `protected` 的，再次佐证了这一点。

## 2.获取泛型的真实类型

接下来就来看看，`TypeReference` 到底是怎么获取到泛型的真实类型的。核心代码其实就两行：

```java
public class TypeReference<T> {
    protected final Type type;

    /**
     * Constructs a new type literal. Derives represented class from type
     * parameter.
     *
     * <p>Clients create an empty anonymous subclass. Doing so embeds the type
     * parameter in the anonymous class's type hierarchy so we can reconstitute it
     * at runtime despite erasure.
     */
    protected TypeReference(){
        // 1. 获取当前类的父类的类型定义，由于我们采用了创建匿名子类的方式，所以这里拿到的就是 TypeReference的类型定义。
        Type superClass = getClass().getGenericSuperclass();
        // 2.强转为ParameterizedType，获取到泛型参数数组。
        Type type = ((ParameterizedType) superClass).getActualTypeArguments()[0];
        // 省略缓存逻辑
        this.type = cachedType;
    }
    
    // 其他方法
}
```

debug 进去看一下，果然获取到了真实的泛型类型信息：

![JSONObject]({{ site.baseurl }}/assets/images/posts/typereference/2.png)

至此我们就知道了，原来 `TypeReference` 是通过强制调用方创建匿名内部类实例，再通过 `getGenericSuperclass()` 方法获取的泛型的真实类型的。

# 三、一点延伸

## 1. getGenericSuperclass 的工作原理

`getGenericSuperclass` 有个特性，见下面的示例：

```java
public class ReflectionTest {

    static class SubArrayList1<E> extends ArrayList<E> {

    }

    static class SubArrayList2 extends ArrayList<String> {

    }

    private static void printSuperclass(Class<?> c) {
        Type superclass = c.getGenericSuperclass();
        ParameterizedType parameterizedType = (ParameterizedType) superclass;
        System.out.println("superclass:" + parameterizedType.getTypeName());
    }

    public static void main(String[] args) {
        SubArrayList1<String> subArrayList1 = new SubArrayList1<>();
        printSuperclass(subArrayList1.getClass());
        SubArrayList2 subArrayList2 = new SubArrayList2();
        printSuperclass(subArrayList2.getClass());
        printSuperclass(new ArrayList<String>() {}.getClass());
    }

}
```

运行后会输出：

```
superclass:java.util.ArrayList<E>
superclass:java.util.ArrayList<java.lang.String>
superclass:java.util.ArrayList<java.lang.String>
```

可以看出该方法仅支持在源码里指明了类型的情况，如果源码里没指明，也是无法获取到真是类型的。

翻阅了网上的[这篇问答](https://stackoverflow.com/questions/42874197/getgenericsuperclass-in-java-how-does-it-work)，说是 class 文件中保存了一个 Signature 属性（ [JVMS §4.7.9](https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-4.html#jvms-4.7.9)），里面存储了泛型参数信息，然后 `getGenericSuperclass` 就是去读取了这里的信息。

为了验证上面的说法，我们看一下 ReflectionTest 编译过后的类文件，找找看里面的 Signature 属性，发现的确符合上面的说法：

```
ReflectionTest.class :
没找到

ReflectionTest\$1.class :
Signature: #13                          // Ljava/util/ArrayList<Ljava/lang/String;>;

ReflectionTest\$SubArrayList1.class :
Signature: #16                          // <E:Ljava/lang/Object;>Ljava/util/ArrayList<TE;>;

ReflectionTest\$SubArrayList2.class :
Signature: #14                          // Ljava/util/ArrayList<Ljava/lang/String;>;
```

所以，其实 `getGenericSuperclass` 并没有获取运行时类型的魔力，它只是读取了编译期确定并存储在 Class 文件里的泛型类型而已。

## 2. getGenericInterfaces

另外，JDK 还提供了 `getGenericInterfaces` 这个方法，用于查询实现的接口的，用法类似：

```java
public class ReflectionTest {

    class TestInterface implements Callable<String>, Comparable<Integer> {

        @Override
        public String call() {
            return null;
        }

        @Override
        public int compareTo(Integer o) {
            return 0;
        }

    }

    private static void printInterfaces(Class<?> c) {
        Type[] types = c.getGenericInterfaces();
        for (Type type : types) {
            ParameterizedType parameterizedType = (ParameterizedType) type;
            System.out.println(parameterizedType.getTypeName());
        }
    }

    public static void main(String[] args) {
        printInterfaces(TestInterface.class);
    }

}

```

运行后会输出：

```
java.util.concurrent.Callable<java.lang.String>
java.lang.Comparable<java.lang.Integer>
```

背后的实现想必也是去读取 Signature 属性：

```
ReflectionTest\$TestInterface.class : 
Signature: #32                          // Ljava/lang/Object;Ljava/util/concurrent/Callable<Ljava/lang/String;>;Ljava/lang/Comparable<Ljava/lang/Integer;>;

```

## 3. getGenericClass?
那么很自然会想，是不是还有一个形如 `getGenericClass` 的方法，可以直接获取当前类型的泛型信息呢？然后再仔细翻了一遍 java.lang.Class，发现并没有提供这样的方法，这又是为什么呢？

其实如果深入理解了 `getGenericSuperclass` 和 `getGenericInterfaces` 的工作原理之后，这个问题就清楚了。
我们已经知道，上面两个方法都是去读取编译完成的 class 文件里的 Signature 属性来获取泛型类型的，但如果一个泛型类在编译期并没有指定具体的类型，那么可以想象它的 Signature 属性值应该就是擦除后的类型，也就无法获取了。

可以写一个简单的例子验证一下：

```java
public class BaseGeneric<T> {

    private T data;

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public BaseGeneric(T data) {
        this.data = data;
    }

    public BaseGeneric() {

    }

    public static void main(String[] args) {
        new BaseGeneric<String>() {};
    }

}
```

class 文件信息：

```
BaseGeneric.class
Signature: #31                          // <T:Ljava/lang/Object;>Ljava/lang/Object;

BaseGeneric$1.class
Signature: #13                          // Lcom/sunshinevvv/thinkinginjava/generics/BaseGeneric<Ljava/lang/String;>;
```

可以看到只有匿名内部类 BaseGeneric$1 里才有具体的泛型信息，BaseGeneric 自身的 Signature 字段里已经被擦除成了 Object。

所以说，问题的本质并不是无法获取当前类型的泛型信息，而是无法获取编译期不确定的泛型信息。

# 四、总结

* 由于 Java 的类型擦除机制，如果直接传泛型类型给 fastjson，会导致获取不到真实的运行类型而反序列化失败。
* fastjson 提供了一个 TypeReference 类专门用于处理泛型类型。
* TypeReference 的机制是创建一个目标类型的匿名子类，再调用 Class.getGenericSuperclass 方法获取到真实泛型类型。
* Class.getGenericSuperclass 方法的原理是读取 Class 文件里的 Signature 属性。
* Signature 属性是泛型类型的一个特有属性，存储了源码里声明的泛型类型，如果编译期没有指明，那这个字段存储的就是擦除之后的类型。
* 在泛型擦除机制下，Java 依旧无法在运行时动态获取泛型类的真实类型参数，TypeReference 里取到的类型信息其实是在编译期确定的。
