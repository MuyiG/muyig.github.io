---
layout: post
title: 深入理解 ThreadLocal
description: ""
categories: [Java]
tags: [Java, 并发]
---

* Kramdown table of contents
{:toc .toc}

# 1.基础概念
ThreadLocal ，顾名思义就是用来提供线程（Thread）内部的局部（Local）变量的，主要应用场景为在同一个线程内方便地共享变量。

例如：一次用户请求，服务器会为其开一个线程，我们在线程中创建一个 ThreadLocal，里面存请求上下文信息，这样在之后获取这些信息时就可以很方便地拿到，而不用层层显式传参。

# 2.实现原理
ThreadLocal 的实现原理并不复杂，核心就是在 Thread 类里维护了一个 Map：
```java
/* ThreadLocal values pertaining to this thread. This map is maintained
* by the ThreadLocal class. */
ThreadLocal.ThreadLocalMap threadLocals = null;
```
然后通过 ThreadLocal 的接口读写这个变量：
```java
/**
* Get the map associated with a ThreadLocal. Overridden in
* InheritableThreadLocal.
*
* @param  t the current thread
* @return the map
*/

ThreadLocalMap getMap(Thread t) {
    return t.threadLocals;
}

/**
* Create the map associated with a ThreadLocal. Overridden in
* InheritableThreadLocal.
*
* @param t the current thread
* @param firstValue value for the initial entry of the map
*/
void createMap(Thread t, T firstValue) {
    t.threadLocals = new ThreadLocalMap(this, firstValue);
}
```
至于 ThreadLocalMap，是一个专门为 ThreadLocal 应用场景定制的一个 HashMap，实现细节可以先不去管，Key 为 ThreadLocal 的实例，Value 为线程局部变量。所以说，ThreadLocal 本身并不存储值，它只是作为一个 key 来让线程从 ThreadLocalMap 获取 value。

准备工作做好了，接下来看下 ThreadLocal 是怎么实现线程局部变量的读写的，核心代码也都很简单。

*   get：其实就是去读取 map 里的值。

```java
/**
* Returns the value in the current thread's copy of this
* thread-local variable.  If the variable has no value for the
* current thread, it is first initialized to the value returned
* by an invocation of the {@link #initialValue} method.
*
* @return the current thread's value of this thread-local
*/
public T get() {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        ThreadLocalMap.Entry e = map.getEntry(this);
        if (e != null) {
            @SuppressWarnings("unchecked")
            T result = (T)e.value;
            return result;
        }
    }
    return setInitialValue();
}
```
当 map 为空或者没有读到值时，会触发初始化逻辑：
```java
/**
* Variant of set() to establish initialValue. Used instead
* of set() in case user has overridden the set() method.
*
* @return the initial value
*/
private T setInitialValue() {
    T value = initialValue();
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null)
        map.set(this, value);
    else
        createMap(t, value);
    return value;
}
```
initialValue() 是一个可重写的接口，用于让开发者自定义想要的初始值。
```java
/**
* Returns the current thread's "initial value" for this
* thread-local variable.  This method will be invoked the first
* time a thread accesses the variable with the {@link #get}
* method, unless the thread previously invoked the {@link #set}
* method, in which case the {@code initialValue} method will not
* be invoked for the thread.  Normally, this method is invoked at
* most once per thread, but it may be invoked again in case of
* subsequent invocations of {@link #remove} followed by {@link #get}.
*
* <p>This implementation simply returns {@code null}; if the
* programmer desires thread-local variables to have an initial
* value other than {@code null}, {@code ThreadLocal} must be
* subclassed, and this method overridden.  Typically, an
* anonymous inner class will be used.
*
* @return the initial value for this thread-local
*/
protected T initialValue() {
    return null;
}
```
*   set：其实就是往 map 里面放值。

```java
/**
* Sets the current thread's copy of this thread-local variable
* to the specified value.  Most subclasses will have no need to
* override this method, relying solely on the {@link #initialValue}
* method to set the values of thread-locals.
*
* @param value the value to be stored in the current thread's copy of
*        this thread-local.
*/
public void set(T value) {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null)
        map.set(this, value);
    else
        createMap(t, value);
}
```
*   remove：用于使用完毕时清除数据，务必调用，不然会出现内存泄漏问题，见下文

```java
/**
* Remove the entry for key.
*/
private void remove(ThreadLocal<?> key) {
    Entry[] tab = table;
    int len = tab.length;
    int i = key.threadLocalHashCode & (len-1);
    for (Entry e = tab[i];
         e != null;
         e = tab[i = nextIndex(i, len)]) {
        if (e.get() == key) {
            e.clear();
            expungeStaleEntry(i);
            return;
        }
    }
}
```

# 3.内存泄漏问题
所谓内存泄漏，就是已经无法访问的内存却没有释放，ThreadLocal 使用不当时会导致内存泄漏问题。

首先看一下 ThreadLocal 运行时的内存示意图：

![ThreadLocal 运行时内存示意图](https://upload-images.jianshu.io/upload_images/73236-3830c23366e24ad7.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

ThreadLocal.ThreadLocalMap的 Key 实现是弱引用，也即图中的虚线。弱引用不会阻止 GC，因此考虑下面的情况：

*   ThreadLocalRef 被清除了，堆中的 ThreadLocal 实例不存在强引用了，被 GC 回收。

*   ThreadLocalMap 里出现了一条 Key 为 null 的 Entry，后续无法读写，也无法回收，造成内存泄漏。

如果当前线程结束后被销毁，则这一块内存可以被释放；但是如果是线程池的模式，线程迟迟不结束的话，这个问题就会一直存在。

其实，ThreadLocalMap 的设计中已经考虑到这种情况，也加上了一些防护措施：在 ThreadLocal 的 get(), set(), remove() 的时候都会清除线程 ThreadLocalMap 里所有 key 为 null 的 value。

但这样也无法完全避免内存泄漏，因为可能上游再也不会调用get(),set(),remove()方法了，参考文章里也给出了一个 Tomcat 内存泄漏的实例：[ThreadLocal 内存泄漏的实例分析](https://blog.xiaohansong.com/ThreadLocal-leak-analyze.html) 。

正确的处理方式是：**每次使用完 ThreadLocal，都调用它的 remove() 方法清除数据** ，这样才能从根源上避免内存泄漏问题。

# 4.应用实战
下面以在一次请求中透传上下文信息为例，来实际演示 ThreadLocal 用法。

首先创建一个类来管理 ThreadLocal 实例：
```java
public class ContextInfoThreadLocal {

    private static final ThreadLocal<ContextInfo> CONTEXT_INFO_THREAD_LOCAL = new ThreadLocal<>();

    public static void set(ContextInfo contextInfo) {
        CONTEXT_INFO_THREAD_LOCAL.set(contextInfo);
    }

    public static ContextInfo get() {
        return CONTEXT_INFO_THREAD_LOCAL.get();
    }

    public static void remove() {
        CONTEXT_INFO_THREAD_LOCAL.remove();
    }
}
```
然后在请求的入口处把上下文信息放进去，最好使用AOP的方式：
```java
    @Around("pointcut()")
    public Object around(ProceedingJoinPoint point) {
        try {
            ContextInfo ContextInfo = getContextInfo();
            // 把 contextInfo 信息放入ThreadLocal
            ContextInfoThreadLocal.set(contextInfo);
            return point.proceed(point.getArgs());
        } catch (Throwable t) {
            // ...
        } finally {
            ContextInfoThreadLocal.remove(); // 记得清理ThreadLocal
        }
    }
```


# 5.参考文章

[https://blog.xiaohansong.com/ThreadLocal-memory-leak.html](https://blog.xiaohansong.com/ThreadLocal-memory-leak.html)

[https://juejin.im/post/5ba9a6665188255c791b0520](https://juejin.im/post/5ba9a6665188255c791b0520)

[http://www.majiang.life/blog/the-smart-way-of-passing-parameter-by-threadlocal/](http://www.majiang.life/blog/the-smart-way-of-passing-parameter-by-threadlocal/)
