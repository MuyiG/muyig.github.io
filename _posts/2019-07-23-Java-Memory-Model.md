---
layout: post
title: 深入理解 Java 内存模型
description: ""
categories: [Java]
tags: [Java, 并发]
---

* Kramdown table of contents
{:toc .toc}

# 一、概述

在之前 [单例模式的Java实现与思考]({{ site.baseurl }}/blog/2019/07/21/Singleton/) 一文里讲到，为了使用 DCL 实现线程安全的单例模式，需要对实例变量使用 volatile 关键字修饰，并简单说明了下原因是为了避免指令重排序而导致的部分初始化问题，本文就来深入研究一下其背后涉及到的 Java 内存模型的相关知识。

# 二、背景知识

为了顺利探讨 Java 内存模型，有一些必要的背景知识需要先了解一下，因为它们是导致并发环境下各种反直觉问题的根源。

## 1. 高速缓存

众所周知，CPU 和内存的速度差距很大，为了弥补二者之间的差距，现代计算机系统在 CPU 和内存之间引入了一层高速缓存：先把运算所需要的数据从内存加载到高速缓存里，这样接下来就可以快速执行运算；运算执行完毕后，再把结果从高速缓存写回到内存中。

基于高速缓存的存储交互很好地解决了处理器与内存的速度矛盾，在单核的场景下也不会产生问题，但是到了多核的场景下，就会导致一个新的问题：缓存一致性（Cache Coherence）。每个CPU都有自己的高速缓存，而它们又共享同一主内存（Main Memory），如图所示。当多个处理器的运算任务都涉及同一块主内存区域时，将可能导致各自的缓存数据不一致，从而导致问题。

![CPU高速缓存示意图]({{ site.baseurl }}/assets/images/posts/cpu-cache.png)

为了解决缓存一致性问题，需要各个处理器访问缓存时都遵循一些协议，在读写时要根据协议来进行操作，这类协议有MSI、MESI（Illinois Protocol）、MOSI、Synapse、Firefly及DragonProtocol等。

在特定的操作协议下，对特定的内存或高速缓存进行读写访问的过程抽象，就称为内存模型。为了和后文 Java 内存模型作区分，这里姑且称之为平台内存模型，不同架构的物理机会有不同的实现。

## 2. 乱序执行

除了增加高速缓存之外，为了提高性能，处理器还可能会对输入代码进行乱序执行（Out-Of-Order Execution），只要保证该结果与顺序执行的结果是一致的即可，因此程序中各个语句计算的先后顺序与输入代码中的顺序未必一致。

比如下面三行简单的语句（这里以高级语言描述并不太恰当，实际上应该是 CPU 指令）：

```java
i = 1;
j = i;
k = 2;
```

到了处理器那里，实际的指令执行可能会是：

```java
i = 1;
k = 2;
j = i;
```

由于 `j = i` 这条语句对 `i = 1` 的执行有依赖，所以 CPU 不会把他们的顺序弄反，但是 `k = 2` 这条语句和上面两句没有任何依赖，所以执行顺序可以随意安排。

## 3. 指令重排序

与处理器的乱序执行优化类似，Java虚拟机的编译器中也有类似的指令重排序（Instruction Reorder）优化。

指令重排序可能会导致并发问题，参见下面这个例子。

```java
public class PossibleReordering {
    
    static int x = 0, y = 0;
    static int a = 0, b = 0;
    
    public static void main(String[] args) throws InterruptedException {
        Thread one = new Thread(new Runnable() {
            public void run() {
                a = 1;
                x = b;
            }
        });
        
        Thread other = new Thread(new Runnable() {
            public void run() {
                b = 1;
                y = a;
            }
        });
        
        one.start(); other.start();
        one.join(); other.join();
        System.out.println("( "+ x + "," + y + ")");
    }
    
}
```

思考一下，这段代码有哪些可能的输出？

(1, 0), (0, 1), (1, 1) 是比较容易想出来的，但实际上还有可能会输出 (0, 0)，这是因为两个线程内部的代码没有数据依赖关系，所以可以进行自由重排序，比如一种重排序后的实际执行顺序是下图这样的，就会产生 (0, 0 的输出)。

![指令重排序示意图]({{ site.baseurl }}/assets/images/posts/reorder.png)

# 三、Java 内存模型

有了上面的背景知识，接下来探讨 Java 的内存模型。

Java虚拟机规范中定义了一种内存模型（Java Memory Model, JMM），目的是屏蔽掉各种平台的内存模型差异，以实现让Java程序在各种平台下都能达到一致的内存访问效果。

## 1. 主内存与工作内存

类似于主内存和高速缓存，Java 里引入了主内存和线程工作内存的概念，其中主内存为所有线程共享，并且规定所有变量都必须存储在主内存（Main Memory）中；每条线程还有自己的工作内存（Working Memory），线程的工作内存中保存了被该线程使用到的变量的主内存副本拷贝。

线程对变量的所有操作（读取、赋值等）都必须在工作内存中进行，而不能直接读写主内存中的变量。不同的线程之间也无法直接访问对方工作内存中的变量，线程间变量值的传递均需要通过主内存来完成，线程、主内存、工作内存三者的交互关系如图12-2所示。

![主内存与工作内存]({{ site.baseurl }}/assets/images/posts/JavaWorkingMemory.png)

注意主内存和工作内存和 JVM 内存区域中的Java堆、栈、方法区等并不是同一个层次的内存划分，这两者基本上是没有关系的，
如果两者一定要勉强对应起来，那从变量、主内存、工作内存的定义来看，主内存主要对应于Java堆中的对象实例数据部分，而工作内存则对应于虚拟机栈中的部分区域。
从更低层次上说，主内存就直接对应于物理硬件的内存，而为了获取更好的运行速度，虚拟机（甚至是硬件系统本身的优化措施）可能会让工作内存优先存储于寄存器和高速缓存中，因为程序运行时主要访问读写的是工作内存。

## 3. Happens-before 规则

类似于多处理器中存在的缓存一致性问题，主内存与工作内存之间也存在一致性问题，再加上指令重排序，在多线程环境下读写共享变量的行为变得十分难以捉摸。
为了解决这个问题，JMM 定义了一系列的访问规则，但是这种定义十分烦琐，实践起来很麻烦，所以可以使用这种定义的一个等效判断规则——Happens-before。

规则定义：**如果操作A Happens-before 操作B，那么操作A执行的结果都会对操作B可见。**

注意这里的操作A和操作B可能分别属于不同的线程，而且 Happens-before 关系关注的是可见性，和时间顺序没有关系。

举一个例子演示一下这个规则：

```java
// 以下操作在线程A中执行
i = 1;

// 以下操作在线程B中执行
j = i;

// 以下操作在线程C中执行
i= 2；
```

假设这三个操作具备这样的关系：线程C中的操作 > 线程B中的操作 > 线程A中的操作（为了简便，这里用大于号代表 Happens-before 关系）。那么线程C对于i的赋值操作就对于线程B可见，而线程A的赋值操作对于线程B不可见，所以线程B执行的结果会把j赋值为2。

完整的 Happens-before 规则如下：

* 程序次序规则（Program Order Rule）：在一个线程内，按照程序代码顺序，书写在前面的操作先行发生于书写在后面的操作。准确地说，应该是控制流顺序而不是程序代码顺序，因为要考虑分支、循环等结构。
* 管程锁定规则（Monitor Lock Rule）：一个unlock操作先行发生于后面对同一个锁的lock操作。这里必须强调的是同一个锁，而“后面”是指时间上的先后顺序。   
* volatile变量规则（Volatile Variable Rule）：对一个volatile变量的写操作先行发生于后面对这个变量的读操作，这里的“后面”同样是指时间上的先后顺序。
* 线程启动规则（Thread Start Rule）：Thread对象的start()方法先行发生于此线程的每一个动作。   
* 线程终止规则（Thread Termination Rule）：线程中的所有操作都先行发生于对此线程的终止检测，我们可以通过Thread.join()方法结束、Thread.isAlive()的返回值等手段检测到线程已经终止执行。   
* 线程中断规则（Thread Interruption Rule）：对线程interrupt()方法的调用先行发生于被中断线程的代码检测到中断事件的发生，可以通过Thread.interrupted()方法检测到是否有中断发生。   
* 对象终结规则（Finalizer Rule）：一个对象的初始化完成（构造函数执行结束）先行发生于它的finalize()方法的开始。   
* 传递性（Transitivity）：如果操作A先行发生于操作B，操作B先行发生于操作C，那就可以得出操作A先行发生于操作C的结论。

有了这些规则，就可以在必要的时候利用这些规则来保证关键变量的可见性。

# 四、volatile关键字

## 1. volatile 的语义
volatile 是 JVM 提供的一个轻量级的同步修饰符，具备两层语义：
1. 保证此变量对所有线程的可见性。这个其实对应上面 Happens-before 规则的 volatile 变量规则。
2. 禁止指令重排序优化。

看下面这个例子：

```java
public class NoVisibility { 
    private static boolean ready;
    private static int number;
    private static class ReaderThread extends Thread { 
        public void run() {
            while (!ready)
                Thread.yield();
            System.out.println(number);
        }
    }
    public static void main(String[] args) { 
        new ReaderThread().start();
        number = 42;
        ready = true;
    } 
}
```

开发者可能会想当然的以为 `ReaderThread` 会很快结束，但由于不存在可见性的保证，在 `main` 线程里对于 `ready` 变量的修改很可能对 `ReaderThread` 不可见，它可能会一直循环下去。
更有甚者，由于指令重排序的存在，很可能 `ReaderThread` 会读取到对 `number` 的修改，而读取不到对 `ready` 变量的修改，从而出现循环输出 42 这样的迷惑行为。

而通过把 `ready` 和 `number` 变量声明为 `volatile` 的，就可以保证 `main` 线程里的修改对于 `ReaderThread` 线程的可见性，同时禁用了指令重排序，保证程序按照期望执行。

## 2. volatile 不具备原子性

但是有一点需要注意，`volatile` 并不具备原子性，看下面这个例子：

```java
public class IncreaseTest {
    
    public static volatile int race = 0;
    
    public static void increase() {
        race++;
    }    
}
```

即使把 `race` 变量声明为 `volatile` 的，保证了可见性，但 `race++` 操作并不是原子的，所以在多线程同时调用 `increase()` 方法时，依旧存在竞态条件，考虑下面的情景：
1. 线程1读取race值为 1
2. 线程2读取race值也为 1
3. 线程1执行自增操作，把增加后的值 2 写回race，注意由于步骤2里的读取操作在这次写入操作之前，不符合 Happens-before 规则，感知不到这次写入的新值。
4. 线程2基于自己之前读取到的值 1（此时该值已经过期，但是线程2不知道），执行自增操作，把增加后的值 2 写回race，出现了问题。

所以在这个场景中，不仅要保证 `race` 变量的可见性，还要保证 `increase()` 操作的原子性，这时候 `volatile` 就不够用了，得用效力更强的 `synchronized` 才行。

## 3.volatile 的应用

### 3.1 状态标记

volatile 首先被用在各种状态标记量上，利用其可见性用于在线程之间传递标记信息。

比如下面这个例子中，通过把 `asleep` 变量标记为 `volatile`，保证了线程2的修改对于线程1的可见性，避免了无限数羊： 

```java
volatile boolean asleep; 

// 线程1
while (!asleep) 
    countSomeSheep();

// 线程2
asleep = true;

```

### 3.2 安全发布（Safe Publication）

所谓安全发布，就是正确地把一个变量暴露给线程外部使用，而保证不会出现问题，其中一个重要手段就是利用 `volatile`。

比如在DCL的单例中，如果处理不小心，就会出现部分初始化问题，暴露一个尚未完成初始化的实例给外部适用。：

```java
public class LazySingletonDCL {

    // 为了更方便分析问题，这里引入两个成员变量
    private int i = 10;
    private String s = "OK";

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

问题核心在于`instance = new LazySingletonDCL()` 这行语句并不是一个原子操作，实际上会被解析为如下三个步骤：

1. 为实例分配内存空间 
2. 初始化实例（设置 i 和 s 的值）
3. 把实例指向刚刚分配的内存

上面操作2依赖于操作1，但是操作3并不依赖于操作2，所以JVM可以对它们进行重排序，经过重排序后如下：

1. 为实例分配内存空间 
2. 把实例指向刚刚分配的内存
3. 初始化实例（设置 i 和 s 的值）

那么在步骤2执行完毕后，还未执行步骤3这一时刻，instance 实例不为 null，但是还未执行完成初始化（i 和 s 的值还是默认值）。
假如恰好在此时，另一个线程进入 getInstance() 方法，判断 instance 实例不为 null，就直接返回了那个尚未被初始化完成的实例，那么它拿到的 i 和 s 就是默认值 0 和 null，而不是期望的 10 和 "OK"。

而加了 volatile 修饰符之后，就可以指示 JVM 不要进行指令重排，从而解决了部分初始化问题，实现了安全发布。

# 五、参考资料
* 《Java Concurrency In Practice》
* 《深入理解Java虚拟机》