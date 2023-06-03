// ==UserScript==
// @name         百合会帖子图片链接辅助提取
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  A tool that help you extract image links from yamibo.
// @author       AsunaML
// @match        https://bbs.yamibo.com/forum.php?mod=viewthread&tid=*
// @match        https://bbs.yamibo.com/thread-*.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yamibo.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 全局数据存储区
    var linkList = [];
    var startLinkUrlId = null;
    var endLinkUrlId = null;
    var startLinkScrollPosition = 0;
    var endLinkScrollPosition = 0;
    var invalidUrlList = [
        'https://bbs.yamibo.com/static/image/common/none.gif',
        ''
    ]
    var randomIdList = [];

    function copyToClipboard(text){
        if (text === ""){
            alert("Calculate result is empty.");
            return;
        }
        navigator.clipboard.writeText(text).then(text=>{
            showToast("拷贝数据成功");
        }).catch(e=>{
            showToast("拷贝数据失败\n请检查控制台记录");
            console.log(e)
        });
    }

    function initToastEnv(){
        let cssString = `#myToastContainer {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 16px 24px;
            background-color: #333;
            color: #fff;
            border-radius: 8px;
            opacity: 0;
            transition: opacity 0.3s ease-out;
          }

          #myToastContainer.show {
            opacity: 1;
          }`
        const styleTag = document.createElement("style");
        styleTag.textContent = cssString;
        document.head.appendChild(styleTag);

        const toastContainer = document.createElement('div')
        toastContainer.id = 'myToastContainer'
        document.body.appendChild(toastContainer);
    }

    function showToast(text) {
        var toastContainer = document.getElementById('myToastContainer');
        toastContainer.innerHTML = text;
        toastContainer.classList.add('show');
        setTimeout(function() {
          toastContainer.classList.remove('show');
        }, 2000);
      }

    function generateRandomId(length) {
        function generateRandomString(length) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }
        let randomId = generateRandomString(length);
        while (randomIdList.includes(randomId)){
            randomId = generateRandomString(length);
        }
        return randomId;
    }

    function deleteUrlComponents() {
        linkList = [];
        const elementsToRemove = document.querySelectorAll('.imageUrlHintComponents');
        elementsToRemove.forEach(element => {
            element.parentNode.removeChild(element);
        });
    }

    function switchUrlComponentsVistable(visable) {
        let howToDisplay = visable ? 'block' : 'none';
        const elementsToRemove = document.querySelectorAll('.imageUrlHintComponents');
        elementsToRemove.forEach(element => {
            element.style.display = howToDisplay;
        });
    }

    function createUrlLinkHint(image_obj, urlRandomId){
        const urlHint = document.createElement('p');
        urlHint.id = 'urlHint-' + urlRandomId;
        urlHint.classList.add('imageUrlHintComponents');
        urlHint.textContent = image_obj.src;
        if (invalidUrlList.includes(image_obj.src)){
            urlHint.style.backgroundColor = 'red';
        }
        else {
            urlHint.style.backgroundColor = 'green';
        }
        return urlHint;
    }

    function creatSetStartLinkBtn(urlRandomId, startLinkRandomId){
        const setStartLinkBtn = document.createElement('button');
        setStartLinkBtn.id = 'startLink-' + startLinkRandomId;// 设置 id 以用于删除
        setStartLinkBtn.textContent = '将该链接设为起点链接';
        setStartLinkBtn.classList.add('imageUrlHintComponents');
        setStartLinkBtn.setAttribute('data-link-id', urlRandomId);// 储存 link id 用于设置
        setStartLinkBtn.addEventListener("click", function() {// 设置终点 url 的 id
            const clickedObj = event.target;
            let url_random_id = clickedObj.getAttribute('data-link-id');
            startLinkUrlId = url_random_id;
            startLinkScrollPosition = window.scrollY;
            showToast("已设置起点链接");
        });
        setStartLinkBtn.style.backgroundColor = "#ffa500";
        return setStartLinkBtn;
    }

    function createSetEndLinkBtn(urlRandomId, endLinkRandomId){
        const endLinkBtn = document.createElement('button');
        endLinkBtn.id = 'endLink-' + endLinkRandomId;// 设置 id 以用于删除
        endLinkBtn.textContent = '将该链接设为终点链接';
        endLinkBtn.classList.add('imageUrlHintComponents');
        endLinkBtn.setAttribute('data-link-id', urlRandomId);// 储存 link id 用于设置
        endLinkBtn.addEventListener("click", function() {// 设置终点 url 的 id
            const clickedObj = event.target;
            let url_random_id = clickedObj.getAttribute('data-link-id');
            endLinkUrlId = url_random_id;
            endLinkScrollPosition = window.scrollY;
            showToast("已设置终点链接");
        });
        endLinkBtn.style.backgroundColor = "#31fbfb";
        return endLinkBtn;
    }

    function createRemoveLinkBtn(urlRandomId, startLinkRandomId, endLinkRandomId){
        const removeLinkBtn = document.createElement('button');
        removeLinkBtn.textContent = '移除该链接';
        removeLinkBtn.classList.add('imageUrlHintComponents');
        removeLinkBtn.setAttribute('data-remove-hint', urlRandomId);
        removeLinkBtn.setAttribute('data-remove-start', startLinkRandomId);
        removeLinkBtn.setAttribute('data-remove-end', endLinkRandomId);
        removeLinkBtn.addEventListener("click", function() {
            const clickedObj = event.target;
            let urlRandomId = clickedObj.getAttribute('data-remove-hint');
            let startLinkRandomId = clickedObj.getAttribute('data-remove-start');
            let endLinkRandomId = clickedObj.getAttribute('data-remove-end');
            const waitDeletedUrlHint = document.getElementById('urlHint-' + urlRandomId);
            const waitDeletedStartLinkBtn = document.getElementById('startLink-' + startLinkRandomId);
            const waitDeletedEndLinkBtn = document.getElementById('endLink-' + endLinkRandomId);

            // 在 js 层面上删除 csv 数据
            linkList = linkList.filter(function(item) {
                return item !== waitDeletedUrlHint; // 只包含所有不等于指定值的元素
            });

            // 在 html 层面上删除对象
            clickedObj.parentNode.removeChild(clickedObj);
            waitDeletedUrlHint.parentNode.removeChild(waitDeletedUrlHint);
            waitDeletedEndLinkBtn.parentNode.removeChild(waitDeletedStartLinkBtn);
            waitDeletedEndLinkBtn.parentNode.removeChild(waitDeletedEndLinkBtn);
        });
        removeLinkBtn.style.backgroundColor = "#fb3199";
        return removeLinkBtn;
    }

    function refreshImageUrl(){
        // 先删除历史组件
        deleteUrlComponents();

        // 再设置元素
        // 获取所有class为"pcb"的div标签
        let div_list = document.querySelectorAll('div.pcb');
        for (const div_obj of div_list){
            const image_list = div_obj.querySelectorAll('img');
            for (const image_obj of image_list){

                let urlRandomId = generateRandomId(6);
                const urlHint = createUrlLinkHint(image_obj, urlRandomId);

                // 将文本标签对象添加至链接列表
                linkList.push(urlHint);

                let startLinkRandomId = generateRandomId(6);
                const startLinkBtn = creatSetStartLinkBtn(urlRandomId, startLinkRandomId);
                let endLinkRandomId = generateRandomId(6);
                const endLinkBtn = createSetEndLinkBtn(urlRandomId, endLinkRandomId);
                const removeLinkBtn = createRemoveLinkBtn(urlRandomId, startLinkRandomId, endLinkRandomId);

                // 将一系列生成的组件添加到图像后面
                image_obj.insertAdjacentElement('afterend', endLinkBtn);
                image_obj.insertAdjacentElement('afterend', startLinkBtn);
                image_obj.insertAdjacentElement('afterend', removeLinkBtn);
                image_obj.insertAdjacentElement('afterend', urlHint);
            }
        }
    }

    function createRefreshDataBtn(){
        // 创建数据加载按钮
        const loadButton = document.createElement('button');
        loadButton.textContent = '重新加载数据';
        loadButton.addEventListener("click", function() {
            refreshImageUrl();
        });
        return loadButton;
    }

    function createHideDataBtn(){
        // 创建隐藏数据组件按钮
        const hideButton = document.createElement('button');
        hideButton.textContent = '隐藏数据组件';
        hideButton.addEventListener("click", function() {
            switchUrlComponentsVistable(false);
        });
        return hideButton;
    }

    function createScrollToTopBtn(){
        const scrollToTopButton = document.createElement('button');
        scrollToTopButton.textContent = '回到页面顶部';
        scrollToTopButton.addEventListener("click", function() {
            window.scrollTo(0, 0);
        });
        return scrollToTopButton;
    }

    function createScrollToEndBtn(){
        const scrollToEndButton = document.createElement('button');
        scrollToEndButton.textContent = '回到页面底部';
        scrollToEndButton.addEventListener("click", function() {
            window.scrollTo(0, document.body.scrollHeight);
        });
        return scrollToEndButton;
    }

    function createScrollToStartLinkBtn(){
        const scrollToStartLinkBtn = document.createElement('button');
        scrollToStartLinkBtn.textContent = '回到起点链接';
        scrollToStartLinkBtn.addEventListener("click", function() {
            window.scrollTo(0, startLinkScrollPosition);
        });
        return scrollToStartLinkBtn;
    }

    function createScrollToEndLinkBtn(){
        const scrollToEndLinkBtn = document.createElement('button');
        scrollToEndLinkBtn.textContent = '回到终点链接';
        scrollToEndLinkBtn.addEventListener("click", function() {
            window.scrollTo(0, endLinkScrollPosition);
        });
        return scrollToEndLinkBtn;
    }

    function getCopiedData(){
        // 生成链接列表
        let url_list = linkList.map(function(e, idx, ary){
            return invalidUrlList.includes(e.textContent) ? "无效图像链接" : e.textContent;
        });

        // 根据起点终点链接的设置，生成新的链接切片

        // 设置切片起点
        let startIdx = 0;
        if (startLinkUrlId === null) {
            startIdx = 0;
        }
        else {
            const startLinkUrlObj = document.getElementById('urlHint-' + startLinkUrlId);
            startIdx = linkList.indexOf(startLinkUrlObj);
        }

        // 设置切片终点
        let endIdx = 0;
        if (endLinkUrlId === null) {
            endIdx = url_list.length;
        }
        else {
            const endLinkUrlObj = document.getElementById('urlHint-' + endLinkUrlId);
            endIdx = linkList.indexOf(endLinkUrlObj) + 1;
            if (endIdx === -1) {
                throw "找不到 endLinkUrlObj 在数组中的下标";
            }
        }

        // 切片
        url_list = url_list.slice(startIdx, endIdx);// 从零开始，左闭右开

        let title = document.getElementById('thread_subject').textContent;
        let content = title + '\n' + url_list.join('\n') + '\n';
        return content;
    }

    function createCopyDataBtn(){
        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制链接数据';
        copyButton.addEventListener("click", function() {
            copyToClipboard(getCopiedData());
        });
        return copyButton;
    }

    function createNewEditorWindowBtn(){
        const hideButton = document.createElement('button');
        hideButton.textContent = '编辑链接数据';
        hideButton.addEventListener("click", function() {
            // 打开一个新窗口
            let width = 1200;
            let height = 600;
            let screenWidth = window.screen.width;
            let screenHeight = window.screen.height;
            let left = (screenWidth - width) / 2;
            let top = (screenHeight - height) / 2;
            let newWindow = window.open('', 'popupWindow', `width=${width},height=${height},left=${left},top=${top}`);

            // 在新窗口中写入自定义内容
            let copied = getCopiedData();
            newWindow.document.write('<html><body>');
            newWindow.document.write('<textarea style="width: 100%; height: 100%; box-sizing: border-box;">' + copied + '</textarea>');
            newWindow.document.write('</body></html>');

            // 关闭写入流，使内容生效
            newWindow.document.close();

        });
        return hideButton;
    }

    // 创建右侧固定控制面板
    function initControlPannel(){
        // add style node
        let cssString = `
        #myControlPannel {
            position: fixed;
            top: 50%;
            right: 5%;
            width: 15em;
            display: flex;
            flex-direction: column;
        }

        #myControlPannel > * {
            margin-bottom: 1em;
        }

        .oneLine {
            display: flex;
            flex-direction: row;
            justify-content: space-around;
        }

        .oneLine button {
            flex-grow: 1;
            margin: 0em 0.2em 0em 0.2em;
        }

        `;
        const styleTag = document.createElement("style");
        styleTag.textContent = cssString;
        document.head.appendChild(styleTag);

        function createContrlPannelNode(){
            let node = document.createElement('div');
            node.id = 'myControlPannel';
            return node
        }

        function createSplitLine(){
            let node = document.createElement('hr');
            node.style.width = '100%';
            return node
        }

        function createBtnGroup(btnList){
            let node = document.createElement('div');
            node.classList.add('oneLine');
            for (const btn of btnList){
                node.appendChild(btn);
            }
            return node;
        }

        // add contrl pannel
        let controlPannel = createContrlPannelNode();

        controlPannel.appendChild(createBtnGroup([
            createNewEditorWindowBtn(),
            createCopyDataBtn()
        ]));

        controlPannel.appendChild(createBtnGroup([
            createRefreshDataBtn(),
            createHideDataBtn()
        ]));

        controlPannel.appendChild(createBtnGroup([
            createSplitLine()
        ]));

        controlPannel.appendChild(createBtnGroup([
            createScrollToStartLinkBtn(),
            createScrollToEndLinkBtn()
        ]));

        controlPannel.appendChild(createBtnGroup([
            createScrollToTopBtn(),
            createScrollToEndBtn(),
        ]));

        document.body.appendChild(controlPannel);
    }

    (function(){
        initToastEnv();
        initControlPannel();
    })();

})();