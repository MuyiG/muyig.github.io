---
layout: post
title: "ClassNotFoundException vs. NoClassDefFoundError"
description: ""
categories: [Java]
tags: []
---

* Kramdown table of contents
{:toc .toc}

# 概述
二者产生的原因都是在运行时找不到需要的类，但ClassNotFoundException是一种Checked Exception，NoClassDefFoundError是一种Error。

Exception和Error的区别：
二者都是Throwable的子类，只有Throwable才能被throw和catch。
Exception是程序运行过程中，可以预料的意外情况，应该被捕获，进行相应的处理。
Error是指在正常情况下，不大可能出现的情况，绝大部分的Error都会导致程序自身（比如JVM）处于非正常的、不可恢复状态，所以不便于也不需要捕获。

# ClassNotFoundException
当应用程序尝试通过诸如 Class.forName() 的方式来加载类，但是无法在Classpath下找到对应的类时，就会抛出ClassNotFoundException。eg：

```java
try {
    Class<?> c = Class.forName(className);
} catch (ClassNotFoundException e) {
    System.out.println("No such class: " + className);
}
```

通常情况下，这都是由于没有导入需要的jar包导致的。比如在使用jdbc连接数据库时使用的：Class.forName("oracle.jdbc.driver.OracleDriver");  如果不注意引入jar包就会抛出ClassNotFoundException。

# NoClassDefFoundError
当一个类可以在编译期找到，却无法在运行期找到时，JVM就会抛出NoClassDefFoundError。

一种可能性是编译后的class文件遭到了篡改，导致运行时找不到需要的类。比如：

```java
public class NoClassDefFoundErrorTest {
    public static void main(String[] args) {
        Foo foo = new Foo();
  }
}
class Foo {
}
```

在上面的类编译完成（javac NoClassDefFoundErrorTest.java）之后，去编译输出目录人工删除Foo.class文件，然后再直接运行（java com.sunshinevvv.thinkinginjava.typeinfo.NoClassDefFoundErrorTest），就会抛错：

```java
Exception in thread "main" java.lang.NoClassDefFoundError: com/sunshinevvv/thinkinginjava/typeinfo/Foo
        at com.sunshinevvv.thinkinginjava.typeinfo.NoClassDefFoundErrorTest.main(NoClassDefFoundErrorTest.java:6)
Caused by: java.lang.ClassNotFoundException: com.sunshinevvv.thinkinginjava.typeinfo.Foo
        at java.net.URLClassLoader.findClass(Unknown Source)
        at java.lang.ClassLoader.loadClass(Unknown Source)
        at sun.misc.Launcher$AppClassLoader.loadClass(Unknown Source)
        at java.lang.ClassLoader.loadClass(Unknown Source)
        ... 1 more
```

注意到这里的 Caused by: java.lang.ClassNotFoundException: com.sunshinevvv.thinkinginjava.typeinfo.Foo，可见NoClassDefFoundError和ClassNotFoundException还是有一定的关联的。

另外，如果一个类在初始化时出错了，也会抛出 NoClassDefFoundError。比如：

```java
public class NoClassDefFoundErrorTest {
    public static void main(String[] args) {
        InitErrorClass initErrorClass = new InitErrorClass();
    }
}

class InitErrorClass {
    static {
        int i = 1 / 0;
    }
}
```

会抛错：
```java
Exception in thread "main" java.lang.ExceptionInInitializerError
        at com.sunshinevvv.thinkinginjava.typeinfo.NoClassDefFoundErrorTest.main(NoClassDefFoundErrorTest.java:9)
Caused by: java.lang.ArithmeticException: / by zero
        at com.sunshinevvv.thinkinginjava.typeinfo.InitErrorClass.<clinit>(NoClassDefFoundErrorTest.java:15)
        ... 1 more
```



# 参考资料
* http://www.baeldung.com/java-classnotfoundexception-and-noclassdeffounderror 
* https://dzone.com/articles/java-classnotfoundexception-vs-noclassdeffounderro

