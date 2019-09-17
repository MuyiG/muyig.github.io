---
layout: post
title: 单例模式的Java实现与思考
description: ""
categories: [Java]
tags: [Java, 并发, 设计模式]
---

* Kramdown table of contents
{:toc .toc}


# 一、摘要
本文对单例模式在 Java 里的不同实现方式进行了分析，对比了不同方案的优缺点并给出使用结论。

# 二、单例模式的实现
单例模式的要义是控制某一个类只有一个唯一的实例，并提供一个统一的访问点。它主要用在某些不希望有多个实例的场景，比如线程池。

## 1.基础实现
首先来看一个单例模式的基础实现:

```java
public class Singleton {

    private static final Singleton instance = new Singleton();

    private Singleton() {
        System.out.println("Singleton()");
    }

    public static Singleton getInstance() {
        return instance;
    }
}
```

这个实现声明了一个静态变量 `instance`，利用了 Java 类初始化的规则（详见下方参考资料里的 JSL 12.4.1）: 
* 一个类只有在被实例化，调用静态方法和访问静态变量之前才会被初始化。
* 类的初始化会执行静态初始化块和静态变量的初始化语句。
* 类的初始化过程会加锁，可以保证只会执行一次。

因此这种方式保证了 `instance` 只会在类初始化的时候被创建一次，之后每次通过 `getInstance` 获取到的都是同一个实例。


## 2.懒加载实现
有时不想要实例过早初始化，而是在真正使用到的时候才初始化，这种策略被称为懒加载。

### 2.1 简单实现（存在问题）

```java
public class LazySingletonNaive {

    private static LazySingletonNaive instance;

    private LazySingletonNaive() {
        System.out.println("LazySingletonNaive()");
    }

    public static LazySingletonNaive getInstance() {
        if (instance == null) {
            instance = new LazySingletonNaive();
        }
        return instance;
    }
}
```

问题：

1. 这里的 `getInstance` 方法存在竞态条件，有可能两个线程分别检查到 `instance == null`，然后各自执行了一次实例化操作。
2. 由于指令重排的原因，还有可能造成部分初始化问题，这一点在后面 DCL 时会说到。

### 2.2 线程安全的懒加载

* 方法1：直接对 `getInstance` 方法加 `synchronized` 锁

```java
...
    public static synchronized LazySingletonNaive getInstance() {
...
```

这种方式最直接，但会带来很高的同步性能开销，一般不会使用。

* 方法2：Double Check Lock

```java
public class LazySingletonDCL {

    private static volatile LazySingletonDCL instance; // 这里必须使用 volatile 关键字，是为了避免部分初始化问题，下文详述。

    private LazySingletonDCL() {
        System.out.println("LazySingletonDCL()");
    }

    public static LazySingletonDCL getInstance() {
        if (instance == null) {
            synchronized (LazySingletonNaive.class) {
                if (instance == null) {
                    instance = new LazySingletonDCL();
                }
            }
        }
        return instance;
    }

}

```
`getInstance` 方法的逻辑是：
1. 首先判断 instance 是否为空，如果不为空，则说明已经初始化过了，可以直接使用，这种情况下可以不用进入同步块，避免了绝大多数情况下的性能开销；
2. 如果为空，则说明需要进行初始化，进入同步块，拿到锁之后需要再检查一次 instance 是否为空（Double Check 名称的来源)，如果 instance 为空，则执行初始化，否则说明其他线程已经初始化过了，直接返回即可。

instance 实例必须要使用 volatile 修饰，是为了避免部分初始化问题。详细原因可以参见这篇文章：[深入理解 Java 内存模型]({{ site.baseurl }}/blog/2019/07/23/Java-Memory-Model/)

* 方法3：Holder 方式

```java
public class LazySingletonHolder {

    private static class Holder {
        static final LazySingletonHolder instance = new LazySingletonHolder();
    }

    private LazySingletonHolder() {
        System.out.println("LazySingletonHolder()");
    }

    public static LazySingletonHolder getInstance() {
        return Holder.instance;
    }

}
```

这里新创建了一个静态私有内部类 `Holder`，它的唯一目的就是存储一个静态的 instance 实例。然后这个类只有在 `getInstance` 方法调用时才会初始化，从而把 instance 实例初始化，实现了懒加载。

这种方式也比较简单，同时避免了同步的性能开销，推荐使用。

> 问：同样是利用类的静态变量，为什么说 `Singleton` 和 `LazySingletonHolder` 一个没有懒加载，一个实现了懒加载呢？
> 
> 答：如果按照上面贴出来的代码，`Singleton` 类的初始化时机只有一个，那就是 `getInstance` 方法调用时，那它其实就是懒加载。但是实际中，这个类里可能不止 `getInstance` 一个公开方法，如果还暴露了其他的公开方法或者变量，在访问那些方法或变量时，也会触发类的初始化，就会造成还没调用 `getInstance` 就初始化了实例的情况，所以说它没有实现懒加载。
> 而 `LazySingletonHolder` 类里的 `Holder` 由于被限制为了私有，且静态变量的唯一访问时机就是 `getInstance` 方法，因此可以实现懒加载。
> 所以这两个类的核心区别在于 `instance` 的初始化时机，`Singleton` 没有做严格管控，有可能会由于别的不相关的操作而提前初始化，`LazySingletonHolder` 做了严格管控，从而实现了懒加载。

# 三、几种方式的对比与总结
结论：
1. 基础实现方式足够简单，易于理解，也没有并发问题，如果没有特殊的需求，建议90%的场景直接使用。
2. 如果应用场景确实需要懒加载，建议使用 Holder 方式。
3. DCL 方式有点 tricky，可读性不够好，而且相比 Hold 方式没有优势，因此不建议使用。

> 那是不是 DCL 方式就没有用处了呢？也不是，如果想要对一个实例变量做懒加载，基于静态变量的 Holder 方式就行不通了，此时就必须使用 DCL 才行了。

# 四、参考资料
* 《Java Concurrency In Practice》
* 《Effective Java》
* [JSL 12.4.1](https://docs.oracle.com/javase/specs/jls/se7/html/jls-12.html#jls-12.4.1)
* [volatile关键字的作用、原理](https://monkeysayhi.github.io/2016/11/29/volatile%E5%85%B3%E9%94%AE%E5%AD%97%E7%9A%84%E4%BD%9C%E7%94%A8%E3%80%81%E5%8E%9F%E7%90%86/)

