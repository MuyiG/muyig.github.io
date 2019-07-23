---
layout: post
title: Java 中的 Future 和 FutureTask
description: ""
categories: [Java]
tags: [Java, 并发]
---

* Kramdown table of contents
{:toc .toc}

# 一、前言
Java 中的 Future 是处理并发问题时经常遇到的一个接口，代表了一个「将来」的值，这听起来有点玄乎，本文从源码层面仔细研究一下 Future 的设计思想和其实现类 FutureTask 的细节。

# 二、Future源码解读
Future的源码很简单，只是一个拥有5个方法的接口，这里先省略了注释，快速浏览一遍，下面再展开讲:
```java
public interface Future<V> {
    
    boolean cancel(boolean mayInterruptIfRunning);
    
    boolean isCancelled();
    
    boolean isDone();
    
    V get() throws InterruptedException, ExecutionException;
    
    V get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException;
}
```

首先来看一下作者Doug Lea写的注释：  
A Future represents the result of an asynchronous computation.   
开宗明义地指出了核心理念：**一个 Future 代表了一次异步执行的结果**。  

Methods are provided to check if the computation is complete, to wait for its completion, and to retrieve the result of the computation.   
提供了方法用于检查执行是否完成，等待执行完成，和获取执行的结果。  

接下来分别展开一下这几个方法：
## 1. 获取任务执行结果
```java
/**
 * Waits if necessary for the computation to complete, and then
 * retrieves its result.
 *
 * @return the computed result
 * @throws CancellationException if the computation was cancelled
 * @throws ExecutionException if the computation threw an
 * exception
 * @throws InterruptedException if the current thread was interrupted
 * while waiting
 */
V get() throws InterruptedException, ExecutionException;
```

调用get方法试图获取执行结果时，有几种情况：
* 任务已经完成，则直接拿到结果；
* 任务还在执行中，则阻塞等待执行完成后再拿到结果；
* 如果阻塞等待时当前线程被中断，则抛出`InterruptedException`；
* 任务被取消，则抛出`CancellationException`（是一个`RuntimeException`）
* 任务执行中抛出了异常，则抛出`ExecutionException`

但是这个get方法没有设定超时时间，如果任务执行一直不结束，就会一直等待下去，所以实际中我们一般会使用下面这个带超时的get方法：
```java
/**
 * Waits if necessary for at most the given time for the computation
 * to complete, and then retrieves its result, if available.
 *
 * @param timeout the maximum time to wait
 * @param unit the time unit of the timeout argument
 * @return the computed result
 * @throws CancellationException if the computation was cancelled
 * @throws ExecutionException if the computation threw an
 * exception
 * @throws InterruptedException if the current thread was interrupted
 * while waiting
 * @throws TimeoutException if the wait timed out
 */
V get(long timeout, TimeUnit unit)
    throws InterruptedException, ExecutionException, TimeoutException;
```

## 2. 判断任务是否执行完成
```java
/**
 * Returns {@code true} if this task completed.
 *
 * Completion may be due to normal termination, an exception, or
 * cancellation -- in all of these cases, this method will return
 * {@code true}.
 *
 * @return {@code true} if this task completed
 */
boolean isDone();
```
特别注意一下，这里所说的完成包含了：
* 正常完成
* 被取消
* 执行中抛出异常

## 3. 取消执行
```java
/**
 * Attempts to cancel execution of this task.  This attempt will
 * fail if the task has already completed, has already been cancelled,
 * or could not be cancelled for some other reason. If successful,
 * and this task has not started when {@code cancel} is called,
 * this task should never run.  If the task has already started,
 * then the {@code mayInterruptIfRunning} parameter determines
 * whether the thread executing this task should be interrupted in
 * an attempt to stop the task.
 *
 * <p>After this method returns, subsequent calls to {@link #isDone} will
 * always return {@code true}.  Subsequent calls to {@link #isCancelled}
 * will always return {@code true} if this method returned {@code true}.
 *
 * @param mayInterruptIfRunning {@code true} if the thread executing this
 * task should be interrupted; otherwise, in-progress tasks are allowed
 * to complete
 * @return {@code false} if the task could not be cancelled,
 * typically because it has already completed normally;
 * {@code true} otherwise
 */
boolean cancel(boolean mayInterruptIfRunning);
```
尝试取消一个任务的执行时，有可能会失败，失败的情况有：
* 任务已经正常完成
* 任务已经被取消
* 由于某些原因无法被取消（恩。。所以是什么原因呢？）

如果取消成功，效果是：
* 如果任务尚未执行，则不会被执行
* 如果任务已经被执行，则根据 `mayInterruptIfRunning` 来决定是否要中断执行该任务的线程。

判断是否被取消，这个很直接：
```java
/**
 * Returns {@code true} if this task was cancelled before it completed
 * normally.
 *
 * @return {@code true} if this task was cancelled before it completed
 */
boolean isCancelled();
```

# 三、FutureTask源码解读
FutureTask 是 JDK 提供的一个 Future 的基础实现，在线程池的实现 ThreadPoolExecutor 中，我们调用 submit 或者 invoke 系列方法执行任务时，就是把要执行的任务包装成 FutureTask 进行执行并当做返回值返回的。  

FutureTask 实现了 `RunnableFuture` 接口，这个接口其实就是结合了 `Runnable` 和 `Future`：
```java
/**
 * A {@link Future} that is {@link Runnable}. Successful execution of
 * the {@code run} method causes completion of the {@code Future}
 * and allows access to its results.
 * @see FutureTask
 * @see Executor
 * @since 1.6
 * @author Doug Lea
 * @param <V> The result type returned by this Future's {@code get} method
 */
public interface RunnableFuture<V> extends Runnable, Future<V> {
    /**
     * Sets this Future to the result of its computation
     * unless it has been cancelled.
     */
    void run();
}
```

## 1.成员变量定义
```java
/**
 * The run state of this task, initially NEW.  The run state
 * transitions to a terminal state only in methods set,
 * setException, and cancel.  During completion, state may take on
 * transient values of COMPLETING (while outcome is being set) or
 * INTERRUPTING (only while interrupting the runner to satisfy a
 * cancel(true)). Transitions from these intermediate to final
 * states use cheaper ordered/lazy writes because values are unique
 * and cannot be further modified.
 *
 * Possible state transitions:
 * NEW -> COMPLETING -> NORMAL
 * NEW -> COMPLETING -> EXCEPTIONAL
 * NEW -> CANCELLED
 * NEW -> INTERRUPTING -> INTERRUPTED
 */
private volatile int state;
private static final int NEW          = 0;
private static final int COMPLETING   = 1;
private static final int NORMAL       = 2;
private static final int EXCEPTIONAL  = 3;
private static final int CANCELLED    = 4;
private static final int INTERRUPTING = 5;
private static final int INTERRUPTED  = 6;

/** The underlying callable; nulled out after running */
private Callable<V> callable;
/** The result to return or exception to throw from get() */
private Object outcome; // non-volatile, protected by state reads/writes
/** The thread running the callable; CASed during run() */
private volatile Thread runner;
/** Treiber stack of waiting threads */
private volatile WaitNode waiters;
```

首先是状态定义 state ，作者很贴心的给出了几个可能的状态变更，直观易懂：
 * NEW -> COMPLETING -> NORMAL ： 正常完成
 * NEW -> COMPLETING -> EXCEPTIONAL ： 执行抛出异常
 * NEW -> CANCELLED ： 尚未执行就被取消
 * NEW -> INTERRUPTING -> INTERRUPTED ：执行中被中断，意味着调用了 cancel(true)
 
然后是代表要执行的任务的 callable，任务执行结果 outcome，执行任务的线程 runner。

最后还有一个 waiters，是一个链表结构，代表了阻塞等待该 FutureTask 执行完毕的线程。

## 2.构造方法
然后再看 FutureTask 的构造方法，设置了 callable 和 state 的值，非常直观（这里省略了 Runnable 版本，那个就是把 Runnable 包装成 Callable 而已）：
```java
/**
 * Creates a {@code FutureTask} that will, upon running, execute the
 * given {@code Callable}.
 *
 * @param  callable the callable task
 * @throws NullPointerException if the callable is null
 */
public FutureTask(Callable<V> callable) {
    if (callable == null)
        throw new NullPointerException();
    this.callable = callable;
    this.state = NEW;       // ensure visibility of callable
}
```

## 3.两个检查状态方法
没什么好说的。
```java
public boolean isCancelled() {
    return state >= CANCELLED;
}

public boolean isDone() {
    return state != NEW;
}
```

## 4.run方法
这里是核心，仔细研究一下。
```java
public void run() {
    if (state != NEW ||
        !UNSAFE.compareAndSwapObject(this, runnerOffset,
                                     null, Thread.currentThread()))
        return;
    try {
        Callable<V> c = callable;
        if (c != null && state == NEW) {
            V result;
            boolean ran;
            try {
                result = c.call();
                ran = true;
            } catch (Throwable ex) {
                result = null;
                ran = false;
                setException(ex);
            }
            if (ran)
                set(result);
        }
    } finally {
        // runner must be non-null until state is settled to
        // prevent concurrent calls to run()
        runner = null;
        // state must be re-read after nulling runner to prevent
        // leaked interrupts
        int s = state;
        if (s >= INTERRUPTING)
            handlePossibleCancellationInterrupt(s);
    }
}
```

首先判断如果 `state ！= NEW`，则说明任务已经被执行过了，直接返回。

还有一句 `UNSAFE.compareAndSwapObject(this, runnerOffset, null, Thread.currentThread())` ，参考了[这篇文章](https://blog.csdn.net/yinwenjie/article/details/72909981) 的讲解，大概理解了这句话的意思就是：判断如果当前对象的 runner 值为 null，则设置为 Thread.currentThread()，使用 CAS 保证了该操作的原子性。由于没有别的地方会设置 runner，如果设置失败，则说明任务已经执行过了，直接返回。

之所以使用 runnerOffset，是因为因为Unsafe对象中属性的操作方式都是直接通过内存偏移量的方式找到操作目标。这时候才发现原来类的底部还有一批 Unsafe 相关的变量定义（还挺人性化的，避免一开始看到这么一堆东西把人搞懵逼）：
```java
// Unsafe mechanics
private static final sun.misc.Unsafe UNSAFE;
private static final long stateOffset;
private static final long runnerOffset;
private static final long waitersOffset;
static {
    try {
        UNSAFE = sun.misc.Unsafe.getUnsafe();
        Class<?> k = FutureTask.class;
        stateOffset = UNSAFE.objectFieldOffset
            (k.getDeclaredField("state"));
        runnerOffset = UNSAFE.objectFieldOffset
            (k.getDeclaredField("runner"));
        waitersOffset = UNSAFE.objectFieldOffset
            (k.getDeclaredField("waiters"));
    } catch (Exception e) {
        throw new Error(e);
    }
}
```

好了再回到 run 方法中来，除去各种异常处理，主干逻辑就是调用 callable 的 call 方法执行任务，然后调用 set 方法把结果赋值：
```java
/**
 * Sets the result of this future to the given value unless
 * this future has already been set or has been cancelled.
 *
 * <p>This method is invoked internally by the {@link #run} method
 * upon successful completion of the computation.
 *
 * @param v the value
 */
protected void set(V v) {
    if (UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)) {
        outcome = v;
        UNSAFE.putOrderedInt(this, stateOffset, NORMAL); // final state
        finishCompletion();
    }
}
```

第二次遇到 UNSAFE，就清楚它的套路了，`UNSAFE.compareAndSwapInt(this, stateOffset, NEW, COMPLETING)` 这里是比较 state 的值，如果是 NEW，则置为 COMPLETING。

然后把执行结果写入outcome，并更新状态为 NORMAL（这里又用到了 `UNSAFE.putOrderedInt` 方法，该方法的作用是在不需要让共享变量的修改立刻让其他线程可见的时候，以设置普通变量的方式来修改共享状态，可以减少不必要的内存屏障，从而提高程序执行的效率）。

最后调用 finishCompletion 方法：
```java
/**
 * Removes and signals all waiting threads, invokes done(), and
 * nulls out callable.
 */
private void finishCompletion() {
    // assert state > COMPLETING;
    for (WaitNode q; (q = waiters) != null;) {
        if (UNSAFE.compareAndSwapObject(this, waitersOffset, q, null)) {
            for (;;) {
                Thread t = q.thread;
                if (t != null) {
                    q.thread = null;
                    LockSupport.unpark(t);
                }
                WaitNode next = q.next;
                if (next == null)
                    break;
                q.next = null; // unlink to help gc
                q = next;
            }
            break;
        }
    }

    done();

    callable = null;        // to reduce footprint
}
```

主要就是唤醒等待的线程，并执行一些清理工作。那等待的线程是从哪里来的呢？就是调用 get 时被阻塞住的。

## 5.get方法
两个get方法基本一样，我们来看带超时的版本：
```java
/**
 * @throws CancellationException {@inheritDoc}
 */
public V get(long timeout, TimeUnit unit)
    throws InterruptedException, ExecutionException, TimeoutException {
    if (unit == null)
        throw new NullPointerException();
    int s = state;
    if (s <= COMPLETING &&
        (s = awaitDone(true, unit.toNanos(timeout))) <= COMPLETING)
        throw new TimeoutException();
    return report(s);
}
```

可以看到如果状态在执行中，就会调用 awaitDone 来进行等待：
```java
/**
 * Awaits completion or aborts on interrupt or timeout.
 *
 * @param timed true if use timed waits
 * @param nanos time to wait, if timed
 * @return state upon completion
 */
private int awaitDone(boolean timed, long nanos)
    throws InterruptedException {
    final long deadline = timed ? System.nanoTime() + nanos : 0L;
    WaitNode q = null;
    boolean queued = false;
    for (;;) {
        if (Thread.interrupted()) {
            removeWaiter(q);
            throw new InterruptedException();
        }
        int s = state;
        if (s > COMPLETING) {
            if (q != null)
                q.thread = null;
            return s;
        }
        else if (s == COMPLETING) // cannot time out yet
            Thread.yield();
        else if (q == null)
            q = new WaitNode();
        else if (!queued)
            queued = UNSAFE.compareAndSwapObject(this, waitersOffset,
                                                 q.next = waiters, q);
        else if (timed) {
            nanos = deadline - System.nanoTime();
            if (nanos <= 0L) {
                removeWaiter(q);
                return state;
            }
            LockSupport.parkNanos(this, nanos);
        }
        else
            LockSupport.park(this);
    }
}
```

在主循环中，会把当前线程加入到等待队列 waiters 里去，一旦遇到执行完毕，超时，或者中断，就会从队列中移除并退出等待。

这里可以注意到 awaitDone 方法处理了线程的中断状态，并会抛出 InterruptedException。对于超时和执行完毕的情况，则会直接返回当前的 state。

拿到 state 后，会执行 report 方法进行返回，方法非常直观：
```java
/**
 * Returns result or throws exception for completed task.
 *
 * @param s completed state value
 */
@SuppressWarnings("unchecked")
private V report(int s) throws ExecutionException {
    Object x = outcome;
    if (s == NORMAL)
        return (V)x;
    if (s >= CANCELLED)
        throw new CancellationException();
    throw new ExecutionException((Throwable)x);
}
```

## 6.cancel方法
```java
public boolean cancel(boolean mayInterruptIfRunning) {
    if (!(state == NEW &&
          UNSAFE.compareAndSwapInt(this, stateOffset, NEW,
              mayInterruptIfRunning ? INTERRUPTING : CANCELLED)))
        return false;
    try {    // in case call to interrupt throws exception
        if (mayInterruptIfRunning) {
            try {
                Thread t = runner;
                if (t != null)
                    t.interrupt();
            } finally { // final state
                UNSAFE.putOrderedInt(this, stateOffset, INTERRUPTED);
            }
        }
    } finally {
        finishCompletion();
    }
    return true;
}
```

只有状态为 NEW 的才允许取消，同时会判断 mayInterruptIfRunning 参数：
* 如果为true，则会先把状态改为 INTERRUPTING，再去中断线程，然后再修改状态为 INTERRUPTED；
* 如果为 false，则不会尝试中断线程，直接把状态改为 CANCELLED。

无论那种情况，最终都会调用 finishCompletion 方法，该方法上面已经出现过了。
