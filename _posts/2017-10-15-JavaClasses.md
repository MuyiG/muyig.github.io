---
layout:     post
title:      "Java中常见的几种类的用法"
subtitle:   ""
date:       "2017-10-15 14:48:56"
author:     "杨光"
header-img: "img/home-bg.jpg"
catalog: true
tags:
    - Java
---

遇到过一些比较让人困惑的类，这里简单整理一下。

# 1.Public Class
* 最常遇到的一种类，必须写在同名的 .java 文件里，且只能这么写，没什么特别说明的。

# 2.Class
* 可以写在非同名的java文件里，和该文件里的public class 并列排布。
* 作用域是package，不支持public、private、protected修饰符。
* 选择放在另一个java文件里只是为了组织上的方便，用法和普通类一模一样。

# 3.Inner Class
* 写在其他类定义内，往往自身概念不够独立，依托于外部类概念而存在。比如一个BinaryTree内部的Node，就很适合定义为内部类。
* 使用时需要添加外部类前缀：BinaryTree.Node。
* 会存储一个外部类实例的引用，所以创建时必须提供外部类实例。
* 支持public、private、protected修饰符。

## 3.1.Nested Class（Static Inner Class）
* 比较特殊的一种内部类，带了static修饰符，和普通inner class的区别在于不存储外部类实例的引用，所以可以不依赖外部类实例创建。
* 支持public、private、protected修饰符。

# 代码示例
OuterClass.java
```java
public class OuterClass {

    /**
     * 普通非静态InnerClass，支持四种访问控制符
     */
    class InnerClass {

    }
    private class PrivateInnerClass {

    }
    protected class ProtectedInnerClass {

    }
    public class PublicInnerClass {

    }

    /**
     * 加了static的内部类变成了Nested Class，支持四种访问控制符，创建时不依赖外部类实例
     */
    static class NestedClass {

    }
    public static class PublicNestedClass {

    }
    protected static class ProtectedNestedClass {

    }
    private static class PrivateNestedClass {

    }
}

/**
 * 只能是package级别，也可以独立出去，写在这里只是为了组织方便
 */
class AnotherClass {

    /**
     * 这里也支持内部类，同上
     */
    class AnotherInnerClass {
        
    }
    static class AnotherNestedClass {
        
    }
}
```

InnerClassTest.java（处于同一个包中）
```java
public class InnerClassTest {
    public static void main(String[] args) {
        // 非静态InnerClass需要外部类实例才能创建：
        OuterClass outerClass = new OuterClass();
        OuterClass.InnerClass a = outerClass.new InnerClass();
        OuterClass.ProtectedInnerClass b = outerClass.new ProtectedInnerClass();
        OuterClass.PublicInnerClass c = outerClass.new PublicInnerClass();

        // 无法直接创建，编译报错： is not an enclosing class
//        OuterClass.InnerClass a = new OuterClass.InnerClass();

        // NestedClass可以直接创建
        OuterClass.NestedClass d = new OuterClass.NestedClass();

        // AnotherClass的用法和普通类并无区别
        AnotherClass e = new AnotherClass();
    }
}
```
