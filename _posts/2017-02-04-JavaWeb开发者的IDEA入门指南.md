---
layout:     post
title:      "Java Web开发者的IDEA入门指南"
subtitle:   "从零开始写一个Servlet"
date:       "2017-02-04 16:04:37"
author:     "杨光"
header-img: "img/home-bg.jpg"
categories: [uncategorized]
tags:
    - Java
    - IDEA
---

## 前言
从开始学Java起，我用的IDE就是eclipse，但是身边的同学们都在逐步转向IDEA，经常听到「IDEA比eclipse好用多了」这样的言论，我在业余时间也试用其写了一些小程序，
感觉挺顺手的，关键是UI实在是太好看了，身为一个颜控，我决定投入IDEA的怀抱，这里记录的就是我摸索学习的过程。

本文将首先简单阐述一下IDEA中的基本概念，接下来从零开始创建工程，使用构建工具Maven搭建一个标准的Java Web应用，写一个简单的Servlet运行在Tomcat上。

## 环境说明

软件 | 版本号 
-----|-----
操作系统 | macOS 10.12.2
JDK | 1.8.0_92（其他的1.6+应该也OK）
IntelliJ IDEA | ULTIMATE 2016.3.2
Tomcat | 7.0.70
Maven | 3.3.9（IDEA内置）

## 基本概念
IDEA中有几个非常基础而重要的概念，在这里简单介绍一下，更多内容可以参考官方文档：[Essentials](https://www.jetbrains.com/help/idea/2016.3/essentials.html)。
为了准确性，这几个词我就直接使用英文原文，不强行翻译了。
- Project  
Project是IDEA里的最高组织单元，IDEA中进行的一切活动都在Project的上下文里。需要注意，IDEA中没有eclipse中Working Set的概念，Project之上无法再做聚合。  
Project本身不会包含源码，脚本，文档等内容，它只会定义Project级别的设置（以XML纯文本的形式保存，一般在`.idea`目录下），以及包含一系列的Module和Library。

- Module  
Module是能进行编译、测试、运行的功能单元，包含上述步骤所需的一切内容，比如源代码，单元测试，构建脚本，部署描述符等。  
Module必须包含在一个Project里。在其根目录下会有一个`.iml`的XML文件保存配置信息。Module下会有各种各样的文件夹，用于不同用处，你可以在一个文件夹上面右键设置其类型：
![folderType](http://upload-images.jianshu.io/upload_images/73236-e402bc058d94aabf.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

- SDK  
SDK（Software Development Kit）是软件开发必备，比如开发Java就需要JDK（Java Development Kit），开发Android则需要Android SDK。IDEA没有内置SDK，所以需要自行安装后再在IDEA里指定目录。

- Library  
Library是一些已经编译好的，可供直接使用的代码。Java Library一般以jar包的形式存在，比如Spring，Mybatis等。

- Dependencies  
Dependencies是模块使用到并依赖的其他实体，包括：SDK，Library以及其他Module。

- Artifact  
Artifact是项目最终的打包产物，Java一般是jar或者war包，里面包含源代码编译出的class，依赖的Library，资源文件等。

## 写一个Servlet
现在开始一步一步写一个Servlet……

首先打开IDEA，会看到一个欢迎界面：
![欢迎界面](http://upload-images.jianshu.io/upload_images/73236-eba412ea34920732.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

选择Create New Project后弹出如下界面，因为我们使用Maven进行构建，所以这里左边选择Maven，之所以没有用archetype，是因为这个webapp的archetype有个坑，巨慢无比，还不如自己手动搭建工程来得快。。

![newProject](http://upload-images.jianshu.io/upload_images/73236-32234f7187a40e25.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


然后填写GroupId和ArtifactId：

![groupId](http://upload-images.jianshu.io/upload_images/73236-08ba8d3655c48139.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

接下来配置Maven选项，因为我自定义了配置，所以这里勾选override，然后选择自己的配置文件：

![mavenRepo](http://upload-images.jianshu.io/upload_images/73236-dfe82d015e2c6017.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

最后点击finish即可，下面的more setting显示还创建了一个同名的module，其Content Root和File Location都在Project根目录下，回想一下，Project本身只是一个集合概念，
本身是无法包含开发内容的，源代码和资源文件这些内容必须放在Project下的Module里，这就是这里创建一个同名Module的用意了。

![finish](http://upload-images.jianshu.io/upload_images/73236-e361aa481a025b75.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

完成之后将会看到如下界面：

![projectStructure](http://upload-images.jianshu.io/upload_images/73236-1b74adf9cf181ce2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
因为这个同名Module的根目录就设置在了Project的根目录，所以我们能看到`.idea`路径，这里是Project的配置，还可以看到`helloidea.iml`文件，这是Module的配置。
pom是Maven工程配置文件，src则是存放源代码的地方。

右下角点上Enable Auto-import。

要用到Servlet，所以需要在pom里配置上相应的依赖：
```
    <dependencies>
        <dependency>
            <groupId>javax.servlet</groupId>
            <artifactId>servlet-api</artifactId>
            <version>2.5</version>
        </dependency>
    </dependencies>
```

写一个简单的Servlet：
```
package com.sunshinevvv;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Created by sunshine on 2017/2/3.
 */
public class DemoServlet extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws javax.servlet.ServletException, IOException {
        doGet(request, response);
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws javax.servlet.ServletException, IOException {
        response.getOutputStream().write("Hello，World！".getBytes());
    }
}
```

在`src/main`下面创建`webapp/WEB-INF`目录，再添加web.xml文件，把刚刚写的Servlet配置进去：
```
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://java.sun.com/xml/ns/javaee"
         xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_2_5.xsd"
         version="2.5">
    <display-name>Demo Web Application</display-name>

    <servlet>
        <servlet-name>demo</servlet-name>
        <servlet-class>com.sunshinevvv.DemoServlet</servlet-class>
        <load-on-startup>1</load-on-startup>
    </servlet>
    <servlet-mapping>
        <servlet-name>demo</servlet-name>
        <url-pattern>/</url-pattern>
    </servlet-mapping>

</web-app>
```
添加web.xml后会弹出一个Frameworks Detected，点击Configure后再点击OK：
![frameworks](http://upload-images.jianshu.io/upload_images/73236-469362508f4a7e92.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

这时候我们的项目结构是这样子的：

![projectStructure2](http://upload-images.jianshu.io/upload_images/73236-902270e23dc25099.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

接下来准备部署到Tomcat里运行，点击`Run`->`Edit Configuration`，然后选择`Tomcat Server`->`Local`：
![runConfig](http://upload-images.jianshu.io/upload_images/73236-cd1000ed071e0f25.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

会提示说没有Artifact，点击Fix然后OK即可：
![fix](http://upload-images.jianshu.io/upload_images/73236-5ee381f16f50a037.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

在Application Server的工具栏里就看到了Tomcat：
![tomcat](http://upload-images.jianshu.io/upload_images/73236-6149409d857eba89.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

点击绿箭头运行即可在浏览器里看到Hello，World！

## 参考资料
- https://www.jetbrains.com/help/idea/2016.3/developing-a-java-ee-application.html