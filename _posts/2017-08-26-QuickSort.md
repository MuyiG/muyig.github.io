---
layout:     post
title:      "快速排序浅析"
subtitle:   ""
date:       "2017-8-26 16:32:59"
author:     "杨光"
header-img: "img/home-bg.jpg"
catalog: true
tags:
    - Algorithms
    - Java
---

快速排序可能是应用最广的排序算法了，这里来简单分析一下这个算法。

# 设计思路
快速排序算法的设计思路是基于分治的：
1. 选取一个元素作为切分元素pivot，然后基于pivot把数组切分成三部分：左子数组（元素小于等于pivot），pivot，右子数组（元素大于等于pivot）。
2. 递归地对左右两个子数组进行快速排序，只要保证左右两个子数组分别有序了，整个数组也就有序了。

维基百科上面的一个动画，比较形象地解释了这个过程：  
![Sorting_quicksort_anim.gif](http://upload-images.jianshu.io/upload_images/73236-3946c2309a769111.gif?imageMogr2/auto-orient/strip)

# 实现
如下是快排的一个Java实现：
```java
public class QuickSort {
    public static void sort(Comparable[] a) {
        StdRandom.shuffle(a);
        sort(a, 0, a.length - 1);
    }

    private static void sort(Comparable[] a, int lo, int hi) {
        if (lo >= hi) {
            return;
        }
        int j = partition(a, lo, hi);
        sort(a, lo, j - 1);
        sort(a, j + 1, hi);
    }
}
```
主要的排序逻辑就是一个简单的递归，所以算法的核心在切分算法partition上。

一种切分的思路是这样的：
1. 选取a[lo]作为切分元素pivot，用一个指针i从lo+1开始向右遍历数组，遇到一个大于等于pivot的元素就停下，再用一个指针j从hi向左遍历，遇到一个小于等于pivot的元素就停下。
2. 这时候i和j位置的元素显然是错位的，交换之，这样就保证了i左侧的元素都是小于等于p的，j右侧的元素都是大于等于p的。
3. 重复步骤1和2，直到i和j相遇（或者某一个指针遍历了全部元素），就表示数组已经切分完毕，此时只需要把p和左侧元素的最大值，也即是a[j]交换位置即可。

如下是partition方法的实现：
```java
private static int partition(Comparable[] a, int lo, int hi) {
    Comparable pivot = a[lo];
    int i = lo, j = hi + 1; 
    while (true) {
        while (++i < hi && a[i].compareTo(pivot) < 0); 
        while (--j > lo && a[j].compareTo(pivot) > 0); 
        if (i >= j) {
            SortUtil.exchange(a, lo, j); 
            return j;
        }
        SortUtil.exchange(a, i, j);
    }
}
```

# 几个问题
代码看起来没什么问题，但是细节是魔鬼，有几个有意思的问题：
## ++i还是i++？
这么写有没有问题？
```java
int i = lo + 1, j = hi; 
    while (true) {
        while (i++ < hi && a[i].compareTo(pivot) < 0); 
        while (j-- > lo && a[j].compareTo(pivot) > 0); 
```
其实是没问题的，但是这么写的话，i和j在遍历过程中停在的位置其实是“下一个要检查的元素”，对应的交换代码就得这么写：
```java
if (i >= j) {
    SortUtil.exchange(a, lo, j + 1);
    return j;
}
SortUtil.exchange(a, i - 1, j + 1);
```
这会平白多出了几个+1和-1，略微降低了些可读性，所以最好还是使用++i/--j的方式。

## 小心边界情况
很容易犯得一个错误是忽略了边界情况，比如a[lo]是数组最大的元素时，i就会一路向右根本停不下来，直到ArrayIndexOutOfBoundsException，所以需要划定边界i不能超过hi。
要注意，如果i是因为到达hi而终止了遍历，那么对于i这次遍历，a[hi]这个元素实际上是没有被检查过的，大于、小于还是等于pivot都是未知的，但是好在j第一个要检查的元素就是a[hi]，所以还能可以保证a[hi]被检查到的。

给j划定边界是冗余的，因为当j到了lo位置时，一定有a[j].compareTo(pivot) == 0，循环就会终止。

## a[lo]应该和哪个位置交换？
当i和j完成对整个数组的扫描时，切分完成，此时我们需要把pivot元素(即a[lo])放到合适的位置，我们的算法实现里是把a[lo]和a[j]进行了交换，为什么呢？

思考一下i和j停下的时机：
```java
while (++i < hi && a[i].compareTo(pivot) < 0); 
while (--j > lo && a[j].compareTo(pivot) > 0); 
```
i要么是遇到一个大于等于pivot的元素，要么是到达hi时才会停下来，如果是后者，那么此时a[hi]就是未经检查的，它和pivot的大小关系未知，如果a[hi] > pivot，那么交换pivot和a[hi]就会导致问题。

而j要么是遇到一个小于等于pivot的元素，要么是到达lo时停下来，无论是哪一种，都能保证a[j] <= pivot，且j右侧元素大于等于pivot，所以让pivot元素和a[j]交换位置后就能保证pivot左侧元素全部小于等于pivot，右侧元素全部大于等于pivot。

## 小心死循环
因为个人对于++i/i++这种技巧不太喜欢，我最开始写的partition代码是这样子的：
```java
private static int partition(Comparable[] a, int lo, int hi) {
    Comparable pivot = a[lo];
    int i = lo + 1, j = hi; 
    while (true) {
        while (i < hi && a[i].compareTo(pivot) < 0) {
            i++;
        }
        while (j > lo && a[j].compareTo(pivot) > 0) {
            j--;
        }
        if (i >= j) {
            SortUtil.exchange(a, lo, j);
            return j;
        }
        SortUtil.exchange(a, i, j);
    }
}
```
这样写其实有一个很严重的bug，那就是在i和j同时遇到和pivot相同的元素时会造成死循环，考虑这种情况，需要partition的数组是：1 5 1 3 1 2 ，pivot=1。

i在遍历到lo+2时发现a[lo + 2] >= pivot，就会停下来，同理j会停在hi - 1上，然后i和j位置上的元素互换，也就是两个1互换，没有任何实际效果，然后i和j依然停在原位置，继续互换……这样就进入了死循环。

所以这样做的问题关键就在于互换相同元素之后，要保证i和j能够继续遍历而不是停在当前位置上，可以考虑改成下面的逻辑：
```java
private static int partition(Comparable[] a, int lo, int hi) {
    Comparable pivot = a[lo];
    int i = lo + 1, j = hi; 
    while (true) {
        while (i < hi) {
            i++;
            if (a[i].compareTo(pivot) < 0) {
                break;
            }
        }
        while (j > lo) {
            j--;
            if (a[j].compareTo(pivot) > 0) {
                break;
            }
        }
        if (i >= j) {
            SortUtil.exchange(a, lo, j);
            return j;
        }
        SortUtil.exchange(a, i, j);
    }
}
```
但这样写效果上其实等价于最开始的方案了，代码也繁琐了不少，并不推荐。

## i和j何时停？
目前的方案是i在遇到一个 **大于等于** p的元素时停下，如果改为 **大于** 呢？

这不会导致排序错误，但是会在处理只有少数几种取值数据时的性能会比较差，简单举个例子比划一下就可以知道此时的算法性能会比较差，可以通过数学证明此时的算法时间复杂度是平方级别（然而我不会。。）。


# 特性分析
快速排序的性能取决于切分的效率。如果每次正好从中间切分，可以通过数学证明时间复杂度是O(NlgN)，但是实际中的数据未必如此完美，根据概率统计的运行时间一般在1.39NlgN左右。

但是如果最初的数组已经有序，这是最坏的情况，此时算法实际上就约等于选择排序了，时间复杂度变为O(N^2)，所以排序开始会先随机打乱数组以尽量避免最坏情况。

快速排序是不稳定的，稍微思考一下代码实现就可以想清楚这一点。在Java语言中，`Arrays.sort()` 方法对于基本类型的排序使用的就是改造版的快速排序，但是Object类型的排序往往要求稳定性，所以用的是归并排序。

# 改进
1. 递归方法执行到到数组长度比较小时（5~15之间），切换到插入排序，因为此时插入排序效率更高。
2. 不再使用a[lo]作为切分元素，二是从数组中取3个数，用它们中间的那个作为切分元素。
3. 三向切分：把数组切分为三部分，分别对应小于，等于，大于。这又是一个很有意思的算法，这里贴出代码，就不再仔细解释了：
```java
public class ThreeWayQuickSort {

    public static void sort(Comparable[] a) {
        StdRandom.shuffle(a);
        sort(a, 0, a.length - 1);
    }

    private static void sort(Comparable[] a, int lo, int hi) {
        if (lo >= hi) {
            return;
        }
        Comparable v = a[lo];
        int lt = lo, gt = hi, i = lo + 1;
        while(i <= gt) {
            int cmp = a[i].compareTo(v);
            if (cmp < 0) {
                SortUtil.exchange(a, lt++, i++);
            } else if (cmp > 0) {
                SortUtil.exchange(a, i, gt--);
            } else {
                i++;
            }
        }
        sort(a, lo, lt - 1);
        sort(a, gt + 1, hi);
    }
}
```


# 参考
- 《算法》（第四版）2.3 快速排序
- [维基百科 - 快速排序](https://zh.wikipedia.org/wiki/%E5%BF%AB%E9%80%9F%E6%8E%92%E5%BA%8F)