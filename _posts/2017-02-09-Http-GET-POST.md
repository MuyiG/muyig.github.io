---
layout:     post
title:      "HTTP协议中GET和POST方法的区别"
subtitle:   "记一次一波三折的探索之旅"
categories: [计算机基础]
tags: [HTTP]
---

HTTP协议中GET和POST方法的区别已经是老生常谈了，也是面试热门问题，我之前对此只有一个粗浅的印象，这里来认真探讨一下。

## 通常的理解
w3schools关于这个问题的解答：[HTTP 方法：GET 对比 POST](http://www.w3school.com.cn/tags/html_ref_httpmethods.asp) 列出了一般的理解：

方法	| GET| POST 
--- | --- | ---
后退按钮/刷新	| 无害	| 数据会被重新提交（浏览器应该告知用户数据会被重新提交）。
书签	| 可收藏为书签	| 不可收藏为书签
缓存	| 能被缓存	| 不能缓存
编码类型	| application/x-www-form-urlencoded	| application/x-www-form-urlencoded 或 multipart/form-data。为二进制数据使用多重编码。
历史	| 参数保留在浏览器历史中。	| 参数不会保存在浏览器历史中。
对数据长度的限制	| 是的。当发送数据时，GET 方法向 URL 添加数据；URL 的长度是受限制的（URL 的最大长度是 2048 个字符）。 |	无限制。
对数据类型的限制	| 只允许 ASCII 字符。 |	没有限制。也允许二进制数据。
安全性	| 与 POST 相比，GET 的安全性较差，因为所发送的数据是 URL 的一部分。在发送密码或其他敏感信息时绝不要使用 GET ！| POST 比 GET 更安全，因为参数不会被保存在浏览器历史或 web 服务器日志中。
可见性	| 数据在 URL 中对所有人都是可见的。	| 数据不会显示在 URL 中。

> 后来经同学指出，这里关于URL 的长度是受限制的这一点是不对的，HTTP协议并没有限制URI的长度，具体的长度是由浏览器和系统来约束的。

这个对比只是给出了一些现象上的区别，但并没有解释为什么，对于这个问题的理解不能就停在这一层。

## 理解错了？
有一篇文章[99%的人理解错 HTTP 中 GET 与 POST 的区别](http://mp.weixin.qq.com/s?__biz=MzI3NzIzMzg3Mw==&mid=100000054&idx=1&sn=71f6c214f3833d9ca20b9f7dcd9d33e4#rd)，否定了上述回答：“很遗憾，这不是我们要的回答！”，作者说：
> GET和POST本质上就是TCP链接，并无差别。但是由于HTTP的规定和浏览器/服务器的限制，导致他们在应用过程中体现出一些不同。 
GET和POST还有一个重大区别，简单的说：GET产生一个TCP数据包；POST产生两个TCP数据包。  
对于GET方式的请求，浏览器会把http header和data一并发送出去，服务器响应200（返回数据）；
而对于POST，浏览器先发送header，服务器响应100 continue，浏览器再发送data，服务器响应200 ok（返回数据）。

都讲到TCP了，感觉很高大上有木有，起码当时看到这篇文章的我是信了的。

## 反转？？
但是在逛知乎时又看到了这篇文章：[听说『99% 的人都理解错了 HTTP 中 GET 与 POST 的区别』？？](https://zhuanlan.zhihu.com/p/25028045)，指出了前文的两个错误：
> 100 continue 只有在请求里带了`Expect: 100-continue`header 的时候才有意义。  
When the request contains an Expect header field that includes a 100-continue expectation, the 100 response indicates that the server wishes to receive the request payload body, as described in Section 5.1.1. The client ought to continue sending the request and discard the 100 response.
If the request did not contain an Expect header field containing the 100-continue expectation, the client can simply discard this interim response.

> 我们通常在讨论 GET vs POST 的时候，实际上讨论的是 specification，而不是 implementation。什么是 specification？说白了就是相关的 RFC。implementation 则是所有实现了 specification 中描述的代码/库/产品，比如 curl，Python 的 requests 库，或者 Chrome。  
POST 请求怎么发送，根本就不是这段 RFC 在讨论的事情。RFC 中只说明了 100 continue 和 Expect header 的联系，比如你想在 GET 请求里带 body，一样可以发送 Expect: 100-continue 并等待 100 continue，这是符合标准的。  
也就是说，『XHR 发送两个 TCP packets』是关于 implementation 的知识，而不是关于 specification 的知识。你不能说『Chrome 在 AJAX POST 的时候会发两个 TCP packets，GET 只会发一个』是 GET 和 POST 的区别，正如你不能因为北京 PM 2.5 经常爆表就说国家关于工业废气排放的标准有问题。

说得似乎更有道理，而且也搬出了RFC，specification，implementation这些高端词汇，这下子我这个吃瓜群众再也坐不住了，决定亲自去研究一下。

## RFC探秘
首先，什么是RFC呢？Wiki上面的定义是：
> 征求意见稿（英语：Request For Comments，缩写为RFC），是由互联网工程任务组（IETF）发布的一系列备忘录。文件收集了有关互联网相关信息，以及UNIX和互联网社区的软件文件，以编号排定。目前RFC文件是由互联网协会（ISOC）赞助发行。

简单理解RFC就是互联网的规范，我们通常所说的「协议」就是以RFC的形式存在，而现行的HTTP/1.1规范的RFC有如下几个：
[RFC7230](https://tools.ietf.org/html/rfc7230)，
[RFC7231](https://tools.ietf.org/html/rfc7231)，
[RFC7232](https://tools.ietf.org/html/rfc7232)，
[RFC7233](https://tools.ietf.org/html/rfc7233)，
[RFC7234](https://tools.ietf.org/html/rfc7234)，
[RFC7235](https://tools.ietf.org/html/rfc7235)。
其中RFC7231里的Section 4. Request Methods涉及到了几个HTTP方法，接下来仔细阅读这一章节。

> The request method token is the primary source of request semantics;
   it indicates the purpose for which the client has made this request
   and what is expected by the client as a successful result.

这里牵涉到一个很重要的词语：semantic 「语义」，那么什么是语义呢？这一篇文章给出了解释：[语法和语义的区别](http://blog.darkmi.com/2013/04/10/3018.html)。

> 一种语言是合法句子的集合。什么样的句子是合法的呢？可以从两方面来判断：语法和语义。语法是和文法结构有关，然而语义是和按照这个结构所组合的单词符号的意义有关。合理的语法结构并不表明语义是合法的。例如我们常说：我上大学，这个句子是符合语法规则的，也符合语义规则。但是大学上我，虽然符合语法规则，但没有什么意义，所以说是不符合语义的。

对于HTTP请求来说，语法是指请求响应的格式，比如请求第一行必须是 `方法名 URI 协议/版本` 这样的格式，具体内容可以参见之前写的《图解HTTP》读书笔记里面的内容，凡是符合这个格式的请求都是合法的。  

语义则定义了这一类型的请求具有什么样的性质。比如GET的语义就是「获取资源」，POST的语义是「处理资源」，那么在具体实现这两个方法时，就必须考虑其语义，做出符合其语义的行为。

当然在符合语法的前提下实现违背语义的行为也是可以做到的，比如使用GET方法修改用户信息，POST获取资源列表，这样就只能说这个请求是「合法」的，但不是「符合语义」的。
写到这里突然联想到XML里面的两个概念：Well Formed和Valid，似乎也正是语法和语义的理念呢。

上文说到方法是请求语义的主要来源，也即是还有次要来源，一些请求Header可以进一步修饰请求的语义，比如一个带上了 `Range` Header的GET请求就变成了部分请求。

RFC7231里紧接着定义了HTTP方法的几个特性：
1. Safe - 安全  
这里的「安全」和通常理解的「安全」意义不同，如果一个方法的语义在本质上是「只读」的，那么这个方法就是安全的。客户端向服务端的资源发起的请求如果使用了是安全的方法，就不应该引起服务端任何的状态变化，因此也是无害的。
此RFC定义，GET, HEAD, OPTIONS 和 TRACE 这几个方法是安全的。  
但是这个定义只是规范，并不能保证方法的实现也是安全的，服务端的实现可能会不符合方法语义，正如上文说过的使用GET修改用户信息的情况。  
引入安全这个概念的目的是为了方便网络爬虫和缓存，以免调用或者缓存某些不安全方法时引起某些意外的后果。User Agent（浏览器）应该在执行安全和不安全方法时做出区分对待，并给用户以提示。
2. Idempotent - 幂等  
幂等的概念是指同一个请求方法执行多次和仅执行一次的效果完全相同。按照RFC规范，PUT，DELETE和安全方法都是幂等的。同样，这也仅仅是规范，服务端实现是否幂等是无法确保的。  
引入幂等主要是为了处理同一个请求重复发送的情况，比如在请求响应前失去连接，如果方法是幂等的，就可以放心地重发一次请求。这也是浏览器在后退/刷新时遇到POST会给用户提示的原因：POST语义不是幂等的，重复请求可能会带来意想不到的后果。  
3. Cacheable - 可缓存性
顾名思义就是一个方法是否可以被缓存，此RFC里GET，HEAD和某些情况下的POST都是可缓存的，但是绝大多数的浏览器的实现里仅仅支持GET和HEAD。关于缓存的更多内容可以去看RFC7234。

在这三个特性里一直在强调同一个事情，那就是协议不等于实现：协议规定安全在实现里不一定安全，协议规定幂等在实现里不一定幂等，协议规定可缓存在实现里不一定可缓存。这其实就是上面那个作者提到的specification和implementation的关系。

## 语义之争
走到这一步，其实就明白了要理解这两个方法的区别，本质上是 **「语义」的对比而不是「语法」的对比，是「Specification」的对比而不是「Implementation」的对比** 。

关于这两种方法的语义，RFC7231里原文已经写得很好了：
> The GET method requests transfer of a current selected representation
   for the target resource.  GET is the primary mechanism of information
   retrieval and the focus of almost all performance optimizations.
   Hence, when people speak of retrieving some identifiable information
   via HTTP, they are generally referring to making a GET request.  
 A payload within a GET request message has no defined semantics;
   sending a payload body on a GET request might cause some existing
   implementations to reject the request.
   
> The POST method requests that the target resource process the
   representation enclosed in the request according to the resource's
   own specific semantics. 

勉强渣翻一下，再加上点自己的理解：  

GET的语义是请求获取指定的资源。GET方法是安全、幂等、可缓存的（除非有 `Cache-Control` Header的约束）,GET方法的报文主体没有任何语义。

POST的语义是根据请求负荷（报文主体）对指定的资源做出处理，具体的处理方式视资源类型而不同。POST不安全，不幂等，（大部分实现）不可缓存。为了针对其不可缓存性，有一系列的方法来进行优化，以后有机会再研究（**FLAG已经立起**）。

还是举一个通俗栗子吧，在微博这个场景里，GET的语义会被用在「看看我的Timeline上最新的20条微博」这样的场景，而POST的语义会被用在「发微博、评论、点赞」这样的场景中。

## 总结
本文从通常的理解出发，经过一次质疑和又一次反质疑，一波三折，最终通过阅读RFC规范加深了对于HTTP方法的理解，真是一次令人愉快的探究之旅~我最大的感受就是：不要人云亦云，要坚持独立思考，不要满足于二手知识，要努力追本溯源。
