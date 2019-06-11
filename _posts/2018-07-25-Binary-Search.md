---
layout: post
title: "二分查找 - BinarySearch"
description: ""
categories: [Algorithms]
tags: [Algorithms, Java]
---

* Kramdown table of contents
{:toc .toc}

# 一、概述
大部分人肯定都玩过猜数字的游戏：一个人准备一个1-100的数字，让另一个人猜，每猜一次，如果没猜中，对方要告诉他猜大了还是猜小了，然后继续猜，直到猜中为止。
那么如果你是猜数字的人，怎样才能用最少的次数猜中数字呢？想必很多人稍加思考就能想到最佳策略，那就是从50开始猜，如果没猜中，就从下一个区间的中间继续猜，比如如果猜大了，下一次就猜25，如果猜小了，下次就猜75，然后按照相同的策略继续下去……因为每次猜都会把范围缩小到原来的一半，所以最多需要 lg2(100)，取整后是7次，就可以猜出正确的数字。

上面的思想其实就是二分查找，学术一点总结可以参考维基百科：
> 在计算机科学中，二分搜索（英语：binary search），也称折半搜索（英语：half-interval search）[1]、对数搜索（英语：logarithmic search）[2]，是一种在有序数组中查找某一特定元素的搜索算法。搜索过程从数组的中间元素开始，如果中间元素正好是要查找的元素，则搜索过程结束；如果某一特定元素大于或者小于中间元素，则在数组大于或小于中间元素的那一半中查找，而且跟开始一样从中间元素开始比较。如果在某一步骤数组为空，则代表找不到。这种搜索算法每一次比较都使搜索范围缩小一半。


# 二、核心算法
其实上面的猜数字游戏暗含了一个前提，那就是搜索范围是一个不重复的有序的集合（1 - 100），对于无序集合，二分搜索是不适用的，对于存在重复的情况，只会返回第一个搜索到的结果，这一点请务必注意。

经过抽象，二分查找的核心算法是：给定一个有序且不存在重复元素的整数数组nums，和一个目标数字target，查找target在nums中的下标位置。代码如下：

```java
public int search(int[] nums, int target) {
    int low = 0, high = nums.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int temp = nums[mid];
        if (temp < target) {
            low = mid + 1;
        } else if (temp > target) {
            high = mid - 1;
        } else {
            return mid;
        }
    }
    return -1; // -1代表未找到
}
```

因为每次搜索范围都会减半，因此时间复杂度是O(lgN)。

# 三、细节是魔鬼
## 1.计算mid
一种直观的想法是： int mid = (low + high) / 2;

但是不要这么做，因为这样写会在low和high都很大时造成整型溢出。

## 2.low和high的含义
准确理解low和high的含义至关重要，这样才能在一些二分查找的变种场景下灵活运用low和high找到想要的结果。

在主循环内，[low, high]组成了一个闭区间，代表着当前的搜索区间。low左侧（不含low）的元素都是小于target的，high右侧（不含high）的元素都是大于target的，这就是这个循环的不变式，掌握了这一点，就算比较深刻的理解了二分查找的精髓。

## 3.终止条件
为什么循环终止条件是 low <= high ？其实理解了上面low和high的含义之后，这个问题就比较清楚了。
因为[low, high]代表当前的搜索区间，区间内的元素还未搜索过，如果当low == high时就终止了循环，就会导致搜索不完备。

## 4.未命中的场景
搜索结束后，如果找到了目标，则mid指向target所在的下标。
那如果未命中呢？就意味着循环终止，low > high，实际上循环终止时，一定是low = high + 1（这一点可以自己推演分析一下）。

此时这个条件依旧成立：low左侧（不含low）的元素都是小于target的，high右侧（不含high）的元素都是大于target的。那么就可以分析出此时有：nums[high] < target < nums[low]。  
需要注意，当target小于（或者大于）nums所有元素时，high（或者low）会越界。

# 四、实战
https://leetcode.com/tag/binary-search/