// ==UserScript==
// @name        发达人券
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        https://buyin.jinritemai.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  /* eslint-disable */

  //定义需要的各种变量
  //verifyFp 请求需要使用的和fp是同一个值
  const verifyFp = JSON.parse(
    window.localStorage.getItem("__tea_cache_tokens_2018")
  ).user_unique_id;

  //msToken
  const msToken = window.localStorage.getItem("xmst");

  //当前直播中的商品列表
  let currentProducts = [];

  //生效中的优惠券
  let totalCoupon = [];

  //佣金变化商品
  let changeGoods = [];

  //生效中的优惠券
  let allCoupon = [];

  let i = 3;

  let time = 1;
  //是否发券
  let ratio = 0.8;

  let is_change_goods = [];

  //获取生效中的达人券
  async function getExistAnchorCoupon() {
    let totalCoupon = [];
    for (let index = 1; index < 50; index++) {
      let response = await fetch(
        `https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/list?_bid=mcenter_buyin&size=${20}&page=${index}&coupon_status=3`
      );
      if (!response.ok) {
        throw new Error("获取达人券失败");
      }

      const data = await response.json();
      let result = data?.data?.data;
      if (!result) {
        throw new Error("获取达人券失败");
      }

      if (result && result.length > 0) {
        totalCoupon = [...result, ...totalCoupon];
        await delay(1000);
      } else {
        break;
      }
    }

    // if (result && result.length > 0) {
    //   current = [...result, ...current];
    //   await delay(1000);
    //   await getExistAnchorCoupon(current, page + 1);
    // }
    // console.log("所有达人券", totalCoupon);
    return totalCoupon;
  }

  //判断达人券是否领完或者过期
  async function Coupon() {
    let existAnchorCoupon = await getExistAnchorCoupon();
    let result = [];

    for (let index = 0; index < existAnchorCoupon.length; index++) {
      const element = existAnchorCoupon[index];
      let type_detail = element.type_detail;
      let left_amount = element.total_amount - element.apply_amount;
      let expire_time = new Date(element.end_apply_time).getTime() - 180000;
      if (expire_time < new Date().getTime()) {
        console.log(type_detail + "已过期");
        unbind(element.coupon_meta_id, element.outer_id);
      } else if (left_amount > 0) {
        result.push(element);
        //  console.log(type_detail + "还有" + left_amount + "张")
      } else {
        console.log(type_detail + "已领完");
        unbind(element.coupon_meta_id, element.outer_id);
      }
    }

    allCoupon = result;
    return result;
  }

  //获取直播商品信息
  async function getLiveProductInfo(id) {
    try {
      // 等待 getProductId() 的 Promise 解析

      //const url = `https://buyin.jinritemai.com/api/anchor/livepc/promotions?source_type=force&request_from=&promotion_ids=${ids}`;
      let param = decodeURI(`list_type=1&source_type=force&promotion_ids=${id}&extra=has_redpack_activity&promotion_info_fields=all&room_info_fields=all&verifyFp=${verifyFp}&fp=${verifyFp}&msToken=${msToken}`);
      let abogus = generate_a_bogus(param);
      let url = `https://buyin.jinritemai.com/api/anchor/livepc/promotions_v2?${param}&a_bogus=${abogus}`;
      const response = await fetch(
        // `https://buyin.jinritemai.com/api/anchor/livepc/promotions_v2?source_type=force&list_type=1&promotion_ids=${id}`
        url,
        {
          headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      // 注意：response.json() 也是一个 Promise，所以我们需要再次 await
      const data = await response.json();
      const productInfo = data.data.promotions[0];
      //console.log(data);
      return productInfo;
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
      throw error; // 或者你可以返回null或其他错误指示符
    }
  }
  //获取商品列表
  async function getProductsVoListWithDetail() {
    let response = await fetch(
      "https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/promotion_list?_bid=mcenter_buyin&promotion_name_or_id=&page=1&size=200&search_type=1"
    );
    if (!response.ok) {
      throw new Error("获取商品列表失败");
    }

    const data = await response.json();
    let productInfo = data.data.data;
    let errorComplete = [];
    for (let index = 0; index < productInfo.length; index++) {
      const element = productInfo[index];
      let isexclusive_product = await getLiveProductInfo(element.promotion_id);
      if (
        isexclusive_product
        // &&
        // isexclusive_product.exclusive_product_activity_type == 1
      ) {
        element.min_price = isexclusive_product?.price_desc.min_price.origin;
      } else {
        let data = await getProductsDetailById(element.product_id);
        console.log(data);
        let price = data?.data?.promotions[0]?.price;

        if (!price) {
          errorComplete.push(element.product_id);
        }
        element.min_price = price ? price : element.min_price;
      }
    }
    if (errorComplete.length > 0) {
      document.getElementById("change_data").innerText =
        JSON.stringify(errorComplete) + "获取成交价失败";
    }
    document.getElementById("search_goods").style.display = "block";
    document.getElementById("search_goods_ing").style.display = "none";
    return productInfo;
  }
  //获取商品列表
  async function getProductsVoList() {
    let response = await fetch(
      "https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/promotion_list?_bid=mcenter_buyin&promotion_name_or_id=&page=1&size=200&search_type=1"
    );
    if (!response.ok) {
      throw new Error("获取商品列表失败");
    }

    const data = await response.json();
    let productInfo = data.data.data;

    return productInfo;
  }

  //发达人券
  async function setAnchorCoupon(data, retryCount = 0, maxRetries = 3) {
    let url = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/create?_bid=mcenter_buyin`;

    let response = await fetch(url, {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/json", // 告诉服务器数据体的格式
      },
      body: JSON.stringify(data), // 数据体
    });
    let ss = await response.json();
    // if (ss.code != 0 && ss.msg != "商家未授权，不可设置主播券") {
    //   if (retryCount < maxRetries) {
    //     setTimeout(async () => {
    //       await setAnchorCoupon(data, retryCount + 1);
    //     }, 5000);
    //   }
    // }
    return ss;
  }
  let taskTimer;
  let isTaskRunning = false;
  //开启循环任务
  async function scheduleTask() {
    // console.log("start...");
    if (isTaskRunning) return; // 如果任务正在运行，则直接返回，避免并发执行
    isTaskRunning = true;
    try {
      let expireCoupon = await Coupon();
      if (!expireCoupon || expireCoupon.length == 0) {
        expireCoupon = await Coupon();
      }
      // let time = 3;
      let timeInput = document.getElementById("time222").value;
      if (timeInput) {
        time = parseInt(timeInput);
      }
      let start = Math.round(new Date().getTime() / 1000);
      let end = getUnixTimestampInXHours(time);

      let count = 0;

      let filteredArr = currentProducts.filter(
        (item) =>
          item.cos_ratio > 1 &&
          !expireCoupon.some((itemB) => itemB.type_detail == item.product_id) &&
          item.credit * item.total_amount >= 50 &&
          item.shop_is_auth &&
          item.credit <
            (item.min_price / 100) * (item.cos_ratio / 100) -
              (item.min_price / 100) * (item.cos_ratio / 100) * 0.1 +
              i
      );
      // let errorArr = currentProducts.filter(
      //   (x) =>
      //     x.cos_ratio < 2 &&
      //     x.shop_is_auth &&
      //     x.credit >
      //     (x.min_price / 100) * (x.cos_ratio / 100) -
      //     (x.min_price / 100) * (x.cos_ratio / 100) * 0.1 +
      //     i
      // );

      // if (errorArr.length > 0) {
      //   for (let index = 0; index < errorArr.length; index++) {
      //     const element = errorArr[index];
      //     unbind(element.product_id);
      //   }
      //   let text = `${errorArr
      //     .map((x) => {
      //       return `商品：${x.title} 编号：${x.product_id}`;
      //     })
      //     .join(",\n")}`;
      //   window.localStorage.setItem("changeGoods", text);
      //   document.getElementById("change_data").innerText = text;
      // }

      for (let c of filteredArr) {
        if (!isTaskRunning) {
          return;
        }

        if (
          !expireCoupon.some((itemB) => itemB.type_detail == c.product_id) &&
          c.credit * c.total_amount != 0
        ) {
          count++;
          let param = {
            coupon_name: c.product_id,
            max_apply_times: 1,
            type: 52,
            credit: c.credit,
            total_amount: c.total_amount,
            anchor_coupon_scene: 1,
            start_apply_time: start,
            end_apply_time: end,
            start_use_time: start,
            end_use_time: end,
            goods_id_list: c.product_id,
            live_promotion_ids: [c.promotion_id],
            visibility: 1,
            kol_user_tag: 0,
          };
          // 使用await和自定义的delay函数来等待

          await delay(1000 * 1);
          await setAnchorCoupon(param);
        }
      }
      // console.log(`本次发放${count}张券`);
    } catch (error) {
      console.error("任务执行时发生错误:", error);
    } finally {
      isTaskRunning = false; // 任务执行完毕，重置标志
      const interval = 30000; // 等一秒继续执行

      taskTimer = setTimeout(async () => {
        await scheduleTask();
      }, interval);
    }
  }

  //讲解
  async function setcurrent() {
    for (let index = 0; index < 10; index++) {
      const element = currentProducts[index];

      let url = `https://buyin.jinritemai.com/api/anchor/livepc/setcurrent`;

      let response = await fetch(url, {
        method: "POST", // 或者 'PUT'
        headers: {
          "Content-Type": "application/json", // 告诉服务器数据体的格式
        },
        body: JSON.stringify({
          promotion_id: element.promotion_id,
          cancel: false,
        }), // 数据体
      });
      let ss = await response.json();
      if (ss.msg == "当前用户未开播") {
        return;
      }
      await delay(1000 * 30);
      console.log(ss);
    }
  }

  //弹幕
  async function operate() {
    let url = `https://buyin.jinritemai.com/api/anchor/comment/operate`;
    let data = [
      "优惠劵每个商品 只能领一次,想要多买的宝宝。可以换个号购买,点个关注,第二天再买也行",
      "小黄车里都是官旗正品，可以放心购买哦~",
      "欢迎宝子们，有喜欢的可以下方小黄车选一选，没有的商品也可以告诉主播哦",
      "欢迎新进直播间的宝子~",
      "点点关注不迷路，持续上新哦~",
      "点击下方小黄车领券购买，享受大额福利哦~",
      "商品优惠券没出来的可以等一等，马上新一轮发券哦，或者加入主播粉丝团，第一时间处理~",
    ];
    let response = await fetch(url, {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/json", // 告诉服务器数据体的格式
      },
      body: JSON.stringify({
        operate_type: 2,
        content: data[Math.floor(Math.random() * 7)],
      }), // 数据体
    });
    let ss = await response.json();
    if (ss.msg == "参数前置校验未通过") {
      return;
    }
    return ss;
  }

  //作废
  async function unbind(coupon_meta_id, outer_id) {
    let url = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/cancel?_bid=mcenter_buyin`;
    // let coupon = allCoupon.filter((x) => x.type_detail == product_id);
    // if (coupon && coupon.length > 0) {
    //   for (let index = 0; index < coupon.length; index++) {

    // const element = coupon[index];
    //   }
    // }

    const formData = new URLSearchParams();
    formData.append("coupon_meta_id", coupon_meta_id);
    formData.append("outer_id", outer_id);

    let response = await fetch(url, {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", // 告诉服务器数据体的格式
      },
      body: formData.toString(),
    });
    let ss = await response.json();
    console.log(ss);
    return ss;
  }

  function isCurrentTimeWithinXMinutes(unixTimestamp, x) {
    // 获取当前时间的UNIX时间戳（秒）
    const nowInSeconds = Math.floor(new Date().getTime() / 1000);

    // 计算时间差（秒）
    const diffInSeconds = unixTimestamp - nowInSeconds;

    // 检查时间差是否小于等于x分钟（x * 60秒）
    return diffInSeconds <= x * 60;
  }
  //延迟执行等待时间
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  //展示商品
  function showProducts(data) {
    // 假设data是一个商品数组
    const items = document.getElementById("items");

    // 清空容器以便重新添加商品
    //productContainer.innerHTML = '';
    items.innerHTML = "";

    // 遍历商品数组并创建HTML元素
    data.forEach((product, index) => {
      //pageProducts.list.forEach(product => {
      //console.log(product)
      //debugger

      const productDiv = document.createElement("div");
      productDiv.classList.add("product-item"); // 添加一个类以便应用样式
      productDiv.setAttribute("data-id", product.product_id);

      // 创建并添加商品图片
      const img = document.createElement("img");
      img.src = product.cover; // 假设商品对象有一个imageUrl属性
      img.alt = product.shop_name; // 假设商品对象有一个name属性
      productDiv.appendChild(img);
      // 创建商品信息容器
      const productInfo = document.createElement("div");
      productInfo.classList.add("product-info");

      // 创建并添加商品名称和价格等元素（这里只是示例，你可以根据需要添加更多信息）
      const nameSpan = document.createElement("span");
      nameSpan.classList.add("product-name");
      nameSpan.style.display = "inline-block";
      nameSpan.style.overflow = "hidden";
      nameSpan.style.width = "250px";
      nameSpan.style.textOverflow = "ellipsis";
      nameSpan.style.whiteSpace = "nowrap";
      nameSpan.textContent = index + 1 + " " + product.title;
      productInfo.appendChild(nameSpan);

      // ... 其他商品信息的添加，如价格、描述等
      // 创建价格容器
      const priceContainer = document.createElement("div");
      priceContainer.classList.add("price-container");

      // 创建并添加价格
      const priceSpan = document.createElement("span");
      priceSpan.classList.add("product-price");
      priceSpan.textContent = `￥${product.min_price / 100}元`; // 假设商品对象有一个price属性
      priceContainer.appendChild(priceSpan);

      // 创建并添加利润（如果需要的话）
      const spanElement = document.createElement("span");
      spanElement.classList.add("priceDisplay");
      spanElement.style.marginLeft = "5px";
      spanElement.style.color = "#6CA2F6";
      // 设置span的文本内容，例如显示"查询成交价"
      spanElement.textContent = "查询成交价";
      // 设置data-price属性
      spanElement.setAttribute("data-price", product.pay_order_gmv);
      const profitSpan = document.createElement("span");
      profitSpan.classList.add("product-profit");
      profitSpan.style.marginLeft = "5px";
      profitSpan.style.color = "red";
      //计算利润，减去提成的10%
      let pro = (
        (product.min_price / 100) * (product.cos_ratio / 100) -
        (product.min_price / 100) * (product.cos_ratio / 100) * 0.1
      ).toFixed(2);
      profitSpan.textContent = `利润:￥${pro}/件`;
      // 为每个span元素绑定点击事件
      spanElement.addEventListener("click", async function () {
        // let priceValue = this.getAttribute('data-price');
        // let data = await getProductsDetailById(product.product_id);
        let isexclusive_product = await getLiveProductInfo(
          product.promotion_id
        );

        let price = isexclusive_product?.price_desc.min_price.origin;
        // let price = data?.data?.promotions[0]?.price;
        this.innerText = `成交价:￥${price / 100}`;
        profitSpan.innerText = `利润:￥${(
          (price / 100) * (product.cos_ratio / 100) -
          (price / 100) * (product.cos_ratio / 100) * 0.1
        ).toFixed(2)}/件`;
      });
      priceContainer.appendChild(spanElement);

      priceContainer.appendChild(profitSpan);
      productInfo.appendChild(priceContainer);

      productInfo.appendChild(priceContainer);

      // 创建id和佣金容器
      const idAndCosContainer = document.createElement("div");
      idAndCosContainer.classList.add("id-container");
      // 创建并添加商品ID
      const idSpan = document.createElement("span");
      idSpan.classList.add("product-id");
      idSpan.style.marginTop = "10px";
      idSpan.textContent = `商品ID:${product.product_id}`; // 假设商品对象有一个id属性
      idAndCosContainer.appendChild(idSpan);

      //创建佣金
      const cosRatio = document.createElement("span");
      cosRatio.classList.add("cosRatio");
      cosRatio.style.marginLeft = "5px";
      cosRatio.textContent = `佣金:${product.cos_ratio}%`;
      idAndCosContainer.appendChild(cosRatio);

      // 发送失败原因
      const issendSpan = document.createElement("div");
      issendSpan.classList.add("issend");
      issendSpan.style.marginTop = "10px";
      issendSpan.textContent = product.reject_reason; // 假设商品对象有一个id属性
      idAndCosContainer.appendChild(issendSpan);

      // 一键发券
      const sendCoupon = document.createElement("div");
      sendCoupon.classList.add("sendCoupon");
      sendCoupon.style.marginTop = "10px";
      sendCoupon.textContent = "单品发券"; // 假设商品对象有一个id属性
      idAndCosContainer.appendChild(sendCoupon);
      sendCoupon.addEventListener("click", async function () {
        if (product.total_amount * product.credit < 50) {
          showModal("发券异常,券金额*数量不能小于50");
          return;
        }
        //发送
        // let time = 3;
        let timeInput = document.getElementById("time222").value;
        if (timeInput) {
          time = parseInt(timeInput);
        }
        let start = Math.round(new Date().getTime() / 1000);
        let end = getUnixTimestampInXHours(time);
        let param = {
          coupon_name: product.product_id,
          max_apply_times: 1,
          type: 52,
          credit: product.credit,
          total_amount: product.total_amount,
          anchor_coupon_scene: 1,
          start_apply_time: start,
          end_apply_time: end,
          start_use_time: start,
          end_use_time: end,
          goods_id_list: product.product_id,
          live_promotion_ids: [product.promotion_id],
          visibility: 1,
          kol_user_tag: 0,
        };
        let res = await setAnchorCoupon(param);
        if (res.code == 0) {
          showModal("发券成功:" + res.data.coupon_meta_id);
        } else {
          showModal("发券异常");
        }
      });
      productInfo.appendChild(idAndCosContainer);

      // 将商品信息容器添加到商品容器中
      productDiv.appendChild(productInfo);

      //创建达人券输入框
      const inputDiv = document.createElement("div");
      inputDiv.classList.add("product-input");
      inputDiv.style.width = "135px";

      //创建达人券发券金额输入框
      const credit = document.createElement("input");
      credit.classList.add("credit");
      credit.style.height = "35px";
      credit.style.width = "135px";
      credit.value = product.credit ? product.credit : 0;

      credit.setAttribute("data-id", product.product_id);

      inputDiv.appendChild(credit);

      //创建达人券发券张数输入框
      const creditNum = document.createElement("input");
      creditNum.classList.add("credit-num");
      creditNum.style.height = "35px";
      creditNum.style.width = "135px";
      creditNum.style.marginTop = "5px";
      creditNum.value = product.total_amount ? product.total_amount : 0;
      creditNum.setAttribute("data-id", product.product_id);
      inputDiv.appendChild(creditNum);

      productDiv.appendChild(inputDiv);

      // 将商品元素添加到容器中
      items.appendChild(productDiv);
    });

    // });
  }

  //获取商品详细信息
  async function getProductsDetailById(id) {
    let url = `https://buyin.jinritemai.com/pc/selection/search/pmt?verifyFp=${verifyFp}&fp=${verifyFp}&msToken=HZ2-Zpf2rQt55hYtMFgQbij_uJQ3YtdUbbDk-GY2X6yb3VuTgunq-PD4380QkgvWSU_StCEIAj1tNpV53h6JZ0PsQDh3XSzqgrQSqSQGOWP3NAZiHWLBf2b2wMttjg%3D%3D`;
    // let url = `https://buyin.jinritemai.com/pc/selection/decision/pack_detail?verifyFp=${verifyFp}&fp=${verifyFp}&msToken=HZ2-Zpf2rQt55hYtMFgQbij_uJQ3YtdUbbDk-GY2X6yb3VuTgunq-PD4380QkgvWSU_StCEIAj1tNpV53h6JZ0PsQDh3XSzqgrQSqSQGOWP3NAZiHWLBf2b2wMttjg%3D%3D`;

    let response = await fetch(url, {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/json", // 告诉服务器数据体的格式
      },
      body: JSON.stringify({
        page_type: 0,
        page: 1,
        page_size: 200,
        rec_page: 1,
        rec_page_size: 200,
        search_text: id,
        search_id: "",
        input_query: id,
        is_product_distribution: false,
        is_delivery_guarantee: false,
        is_ladder_cos: false,
        common_filter: null,
      }), // 数据体
      // body: JSON.stringify({
      //   scene_info: {
      //     request_page: 2,
      //   },
      //   biz_id: id,
      //   biz_id_type: 2,
      //   enter_from: "pc.unknow.unknow",
      //   data_module: "core",
      // }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json(); // 解析JSON响应
    return data;
  }

  //创建页面操作元素=====================================================================

  // 弹窗父元素
  var divElement = document.createElement("div");
  divElement.style.position = "fixed"; // 设置为固定定位
  divElement.style.bottom = "0"; // 距离底部0
  divElement.style.left = "0"; // 距离左边0
  divElement.style.backgroundColor = "#EFEFEF"; // 示例背景颜色
  divElement.style.padding = "10px"; // 内边距
  divElement.style.border = "1px solid #ccc"; // 边框样式
  divElement.style.zIndex = "1000"; // 确保div在最上层

  // 左下角按钮
  var buttonElement = document.createElement("button");
  buttonElement.id = "open_modal";
  buttonElement.innerHTML = "发券助手"; // 按钮上的文字
  buttonElement.style.cursor = "pointer"; // 鼠标悬停时指针变为手形
  buttonElement.style.backgroundColor = "#007BFF"; // 按钮背景色
  buttonElement.style.border = "none"; // 无边框
  buttonElement.style.color = "white"; // 文本颜色
  buttonElement.style.padding = "10px 20px"; // 内边距
  buttonElement.style.textAlign = "center"; // 文本居中
  buttonElement.style.textDecoration = "none"; // 去除文本装饰
  buttonElement.style.display = "inline-block"; // 内联块状元素
  buttonElement.style.fontSize = "16px"; // 字体大小
  buttonElement.style.margin = "4px 2px"; // 外边距
  buttonElement.style.borderRadius = "4px"; // 圆角

  // 将按钮添加到div中
  divElement.appendChild(buttonElement);

  // 将div添加到body中
  document.body.appendChild(divElement);
  // 表单内容
  var modalForm = document.createElement("div");
  modalForm.id = "model";
  modalForm.style.position = "fixed"; // 使用fixed定位，使其脱离文档流
  modalForm.style.top = "50%"; // 居中显示
  modalForm.style.left = "50%";
  modalForm.style.transform = "translate(-50%, -50%)"; // 水平垂直居中
  modalForm.style.padding = "20px";
  modalForm.style.width = "600px"; // 设置宽度
  modalForm.style.height = "800px"; // 设置高度
  modalForm.style.backgroundColor = "#fff"; // 白色背景
  modalForm.style.border = "1px solid #ccc"; // 添加边框以便区分
  modalForm.style.borderRadius = "5px"; // 圆角美化
  modalForm.style.zIndex = "9999"; // 确保表单在最上层
  modalForm.innerHTML = `
      <style>
  .product-container {
    /* 设置容器的高度，根据需要调整 */
    height: 490px; /* 举例：固定高度或根据需要设置为百分比等 */
    /* 当内容超出容器时显示垂直滚动条 */
    overflow-y: auto;
    /* 边框等其他样式... */
   // border: 1px solid #ccc;
    padding: 10px; /* 内边距可以根据需要调整 */
    display:flex
    flex-direction:column
  }

   .yongjin-container {
    /* 设置容器的高度，根据需要调整 */
    height: 100px; /* 举例：固定高度或根据需要设置为百分比等 */
    /* 当内容超出容器时显示垂直滚动条 */
    overflow-y: auto;
    /* 边框等其他样式... */
   // border: 1px solid #ccc;
    padding: 10px; /* 内边距可以根据需要调整 */
    display:flex
    flex-direction:column
  }
  .readonly-input {
      background-color: #f2f2f2; /* 浅灰色背景 */
      color: #666; /* 文字颜色变淡 */
    }

  .product-image {
    width: 90px; /* 图片宽度 */
    height: 90px; /* 图片高度 */
    object-fit: cover; /* 保持图片比例并填充整个元素 */
    margin-right: 20px; /* 图片与文本之间的间距 */
  }

  .product-info {
    flex: 1; /* 文本区域占据剩余空间 */
    display: flex;
    flex-direction: column; /* 垂直方向布局 */
    align-items: flex-start; /* 垂直对齐方式 */
  }

  .product-info > * {
    margin-bottom: 5px; /* 每个文本项之间的间距 */
  }

  .product-inputs {
    display: flex;
    flex-direction: column; /* 垂直方向布局 input */
  }

  .product-inputs input {
    margin-bottom: 5px; /* input 之间的间距 */
  }
  .query-price {
    /* 根据需要添加按钮样式 */
    padding: 5px 10px;
    border: none;
    color: #007BFF;
    cursor: pointer;
  }
  .product-profit {
    /* 利润信息的样式 */
    color: red; /* 假设利润为绿色 */
  }
    .issend {
    /* 利润信息的样式 */
    color: red; /* 假设利润为绿色 */
  }

  .sendCoupon{
    color:blue;
     cursor: pointer;
  }
  .full-width-button {
    display: block; /* 使其成为块级元素，占满整行 */
    width: 95%; /* 使其宽度等于其父元素的宽度 */
    padding: 10px 20px; /* 可选的填充以改善外观 */
    margin-top: 10px; /* 可选的上边距以与产品容器分隔 */
    border-radius: 5px; /* 可选的圆角 */
    border: none; /* 去除边框 */
    background-color: #4CAF50; /* 可选的背景色 */
    color: white; /* 文本颜色 */
    cursor: pointer; /* 鼠标悬停时显示小手图标 */
  }
  .product-item {
    /* 确保商品元素是块级元素 */
    display: flex;
    /* 其他样式，如边框、内边距等 */
    border-bottom: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 10px; /* 可选：为每个商品项添加一些垂直间距 */
  }
  .product-item img{
  width: 90px; /* 图片宽度 */
    height: 90px; /* 图片高度 */
    object-fit: cover; /* 保持图片比例并填充整个元素 */
    margin-right: 20px; /* 图片与文本之间的间距 */
  }
  .priduct-name {
      display: inline-block; /* 或者 block，具体取决于你的布局需求 */
      width: 100px; /* 你可以根据需要调整宽度 */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
  }
      .modal2 {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 15% auto;
      padding: 20px;
      border: 1px solid #888;
      width: 80%;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
    }
    .close:hover,
    .close:focus {
      color: black;
      text-decoration: none;
      cursor: pointer;
    }

  </style>
      <div>
     <h2 style="text-align: center;cursor: pointer;">发券助手+qq1246050820</h2>
      <!-- 为label和input添加一个包装容器 -->
      <div style="display: flex; flex-direction: column;">
          <label for="modalInput">输入发券佣金比例：</label>
          <input type="text" id="ratio" style="height: 40px; border-radius: 5px; border: 1px solid #ccc;" placeholder="输入发券佣金比例，默认0.8">
      </div>
      <div style="display: flex; flex-direction: column;">
          <label for="modalInput">券有效时间：</label>
          <select  id="time222">
    <option value="1">1</option>
    <option value="3">3</option>
    <option value="6">6</option>
    <option value="12">12</option>
        <option value="24">24</option>

</select>
         
      </div>
      <div style="display: flex; justify-content: space-around; margin-top: 10px;height;40"> <!-- 添加这排按钮的容器 -->
      <button style="background-color:#007BFF;border-radius:5px;color:#FFFFFF;border:#007BFF;height:40px;cursor: pointer;" id="start_send">循环发卷</button>
      <button style="border-radius:5px;height:40px;background-color:red;color:#FFFFFF;border:red;cursor: pointer;" id="stop_send">暂停发券</button>
          <button id="update_goods" style="background-color:#007BFF;color:#FFFFFF;border:#007BFF;border-radius:5px;cursor: pointer;">更新商品</button>
          <button id="search_goods_ing" style="background-color:#FFFFFF;color:#000000;border:#007BFF;border-radius:5px;cursor: pointer;display:none">查询中</button>
          <button id="search_goods" style="background-color:#007BFF;color:#FFFFFF;border:#007BFF;border-radius:5px;cursor: pointer;">一键查询</button>

          <button id="set_yongjin" style="background-color:#007BFF;color:#FFFFFF;border:#007BFF;border-radius:5px;cursor: pointer;">一键设置</button>

          <button id="setcurrent_ing" style="border-radius:5px;height:40px;background-color:red;color:#FFFFFF;border:red;cursor: pointer;display:none">讲解中</button>
          <button id="setcurrent" style="background-color:#007BFF;color:#FFFFFF;border:#007BFF;border-radius:5px;cursor: pointer;">讲解</button>
  </div>
  <hr />
  <div style="display: flex; flex-direction: column; margin-top:20px;width:520px" class="yongjin-container">
      <label for="modalInput" style="margin-bottom: 5px;">佣金变化商品：
        <button id="cleanchange" style="background-color:#007BFF;color:#FFFFFF;border:#007BFF;border-radius:5px;cursor: pointer;">清除</button>

  </label>
      <div style="display: flex; justify-content: space-between;" id="change_data">

      </div>
  </div>
  <hr />
  <div class="product-container" id="product-container">

   <label for="modalInput" style="margin-bottom: 5px;">直播商品：</label>
  <div class="items" id="items">
    <img class="product-image" src="https://p3-aio.ecombdimg.com/obj/ecom-shop-material/rKJImILV_m_7ab5e749321033520cae1b0c6f7b6672_sx_941798_www800-800" alt="Product Image">
    <div class="product-info">
    <span class="product-name">商品名称</span>
    <div class="price-container">
      <span class="product-price">价格：100元</span>
      <span class="query-price" style="margin: 0 5px;">查询成交价</span>
      <span class="product-profit" style="">利润：XX元</span>
    </div>
    <span class="product-id" style="margin-top:10px">商品ID：12345</span>
      <span class="issend" style="margin-top:10px"></span>

  </div>
    <div class="product-inputs">
      <input type="text" style="height:40px; border-radius: 5px; border: 1px solid #ccc; padding: 0 10px;" placeholder="输入内容1">
      <input type="text" style="height:40px; border-radius: 5px; border: 1px solid #ccc; padding: 0 10px;"placeholder="输入内容2">
    </div>
  </div>
  <button class="full-width-button"id="updataSet">更新配置</button>
  </div>

          </div>
          <!-- 模态框内容放置在这里 -->
  <div id="myModal" class="modal2">
    <div class="modal-content">
      <span class="close">&times;</span>
      <p id="modalText">这里是一条消息</p>
    </div>
  </div>
      `;
  document.body.appendChild(modalForm);

  //默认隐藏弹窗
  modalForm.style.display = "none";
  //隐藏停止发券按钮
  document.getElementById("stop_send").style.display = "none";

  document.getElementById("open_modal").addEventListener("click", function () {
    if (modalForm.style.display == "none") {
      let change = window.localStorage.getItem("changeGoods");
      document.getElementById("change_data").innerText = change ? change : "";

      let currentProducts1 = window.localStorage.getItem("currentData");
      if (currentProducts1) {
        currentProducts = JSON.parse(currentProducts1);
        showProducts(JSON.parse(currentProducts1));
      }
    }

    modalForm.style.display =
      modalForm.style.display == "none" || !modalForm.style.display
        ? "block"
        : "none";
    // 处理点击事件的代码
  });

  //清楚佣金变化数据
  document.getElementById("cleanchange").addEventListener("click", function () {
    changeGoods = [];
    is_change_goods = [];
    document.getElementById("change_data").innerText =
      JSON.stringify(changeGoods);
    window.localStorage.setItem("changeGoods", JSON.stringify([]));
  });

  // //清楚佣金变化数据
  // document.getElementById("unbind").addEventListener("click", async function () {
  //   await unbind("3540558159221508849")
  // });
  //更新商品
  document
    .getElementById("update_goods")
    .addEventListener("click", async function () {
      const ProductsVoList = await getProductsVoList();
      let data = window.localStorage.getItem("currentData");
      let oldData = [];
      if (data) {
        oldData = JSON.parse(data);
        currentProducts = await mergeObjects(ProductsVoList, oldData);
      } else {
        currentProducts = await mergeObjects(ProductsVoList, []);
      }
      window.localStorage.setItem(
        "currentData",
        JSON.stringify(currentProducts)
      );
      showProducts(currentProducts);
      //console.log(rusult)
      showModal("成功更新商品");
    });
  //更新商品 并查询所有的成交价
  document
    .getElementById("search_goods")
    .addEventListener("click", async function () {
      document.getElementById("search_goods").style.display = "none";
      document.getElementById("search_goods_ing").style.display = "block";
      const ProductsVoList = await getProductsVoListWithDetail();
      let data = window.localStorage.getItem("currentData");
      let oldData = [];
      if (data) {
        oldData = JSON.parse(data);
        currentProducts = await mergeObjects(ProductsVoList, oldData, true);
      } else {
        currentProducts = await mergeObjects(ProductsVoList, []);
      }
      window.localStorage.setItem(
        "currentData",
        JSON.stringify(currentProducts)
      );
      showProducts(currentProducts);
      //console.log(rusult)
      showModal("成功更新商品");
    });

  let read;
  let write;
  //开始讲解
  document
    .getElementById("setcurrent")
    .addEventListener("click", async function () {
      document.getElementById("setcurrent").style.display = "none";
      document.getElementById("setcurrent_ing").style.display = "block";
      setcurrent();

      read = setInterval(() => {
        setcurrent();
      }, 1000 * 30 * 10 + 1000);

      write = setInterval(() => {
        operate();
      }, 1000 * 60 * 5);
    });
  //暂停讲解
  document
    .getElementById("setcurrent_ing")
    .addEventListener("click", async function () {
      document.getElementById("setcurrent_ing").style.display = "none";
      document.getElementById("setcurrent").style.display = "block";
      clearInterval(read);
      clearInterval(write);
    });

  async function update_goods() {
    const ProductsVoList = await getProductsVoList();
    let data = window.localStorage.getItem("currentData");
    let oldData = [];
    if (data) {
      oldData = JSON.parse(data);
      currentProducts = await mergeObjects(ProductsVoList, oldData);
    } else {
      currentProducts = await mergeObjects(ProductsVoList, []);
    }
    window.localStorage.setItem("currentData", JSON.stringify(currentProducts));
    return currentProducts;
  }
  //一键设置佣金
  document
    .getElementById("set_yongjin")
    .addEventListener("click", async function () {
      let couponContainers = document.querySelectorAll(".product-item");
      let credit = document.getElementById("ratio").value;
      if (credit) {
        ratio = parseFloat(credit);
      }
      couponContainers.forEach((container) => {
        // 从 div 获取 data-product-id 属性
        let productId = container.getAttribute("data-id"); // 获取 data-product-id 的值

        // 在 curLiveProduct 中找到对应的产品
        let product = currentProducts.find(
          (item) => item.product_id === productId
        ); // 假设 product_id 是数字

        if (product) {
          let credit = container.querySelector(".credit");
          let creditNum = container.querySelector(".credit-num");
          let quan =
            ((product.min_price / 100) * (product.cos_ratio / 100) -
              (product.min_price / 100) * (product.cos_ratio / 100) * 0.1) *
            ratio;
          credit.value = Math.floor(quan);
          creditNum.value = Math.ceil(50 / Math.floor(quan));
          product.credit = Math.floor(quan);
          product.creditNum =
            Math.floor(quan) == 0 ? 0 : Math.ceil(50 / Math.floor(quan));
        }
      });

      showModal("设置成功");

      //todo....
    });

  let sTime;
  //循环发券 并监听佣金变化
  document
    .getElementById("start_send")
    .addEventListener("click", async function () {
      document.getElementById("start_send").style.display = "none";
      document.getElementById("stop_send").style.display = "block";
      scheduleTask();

      sTime = setInterval(async () => {
        await update_goods();
      }, 1000 * 60);
    });

  //停止发券
  document.getElementById("stop_send").addEventListener("click", function () {
    document.getElementById("start_send").style.display = "block";
    document.getElementById("stop_send").style.display = "none";
    isTaskRunning = false;
    clearInterval(sTime); // 清除定时器

    if (taskTimer) {
      clearTimeout(taskTimer);
      showModal("停止循环发券");
    }
    //todo....
  });
  //更新配置
  document
    .getElementById("updataSet")
    .addEventListener("click", async function () {
      // debugger
      //活动持续1小时
      // let time = 3;
      // let minCos = 1;
      let timeInput = document.getElementById("time222").value;
      if (timeInput) {
        time = parseInt(timeInput);
      }
      //获取当前时间戳
      let start = Math.round(new Date().getTime() / 1000);
      let end = getUnixTimestampInXHours(time);

      let couponContainers = document.querySelectorAll(".product-item");
      couponContainers.forEach((container) => {
        // 从 div 获取 data-product-id 属性
        let productId = container.getAttribute("data-id"); // 获取 data-product-id 的值

        // 在 curLiveProduct 中找到对应的产品
        let product = currentProducts.find(
          (item) => item.product_id === productId
        ); // 假设 product_id 是数字

        if (product) {
          let credit = container.querySelector(".credit");
          let creditNum = container.querySelector(".credit-num");
          //et credit = container.querySelector('.credit');

          if (credit && creditNum) {
            let creditV = parseInt(credit.value);
            let creditNumV = parseInt(creditNum.value);

            // if ((product.price / 100 - creditV) * 0.8 < creditV) {
            //     showModal("优惠券金额不能大于商品券后价的80%");
            //     throw new Error("优惠券金额不能大于商品券后价的80%");
            // }
            product.credit = creditV;
            product.total_amount = creditNumV;
            product.start_apply_time = start;
            product.end_apply_time = end;
            product.start_use_time = start;
            product.end_use_time = end;
          }
        }
      });
      //   let filteredArr = currentProducts.filter(
      //     (item) => item.cos_ratio > minCos && item.shop_is_auth
      //   );

      //   scheduleTask(filteredArr);

      window.localStorage.setItem(
        "currentData",
        JSON.stringify(currentProducts)
      );
      showModal("成功更新配置");
    });
  //创建页面操作元素结束=====================================================================

  // 动态生成提示框的函数
  function showModal(message) {
    // 获取模态框和消息显示元素
    var modal = document.getElementById("myModal");
    var modalText = document.getElementById("modalText");

    // 设置消息内容
    modalText.textContent = message;

    // 显示模态框
    modal.style.display = "block";

    // 添加点击事件监听器以关闭模态框
    var span = document.getElementsByClassName("close")[0];
    span.onclick = function () {
      modal.style.display = "none";
    };

    // 也可以监听点击模态框外部来关闭它（可选）
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  //合并商品对象
  async function mergeObjects(obj1, obj2, create = false) {
    // 创建一个新对象，避免直接修改原始对象
    let mergedObj = [...obj1];

    // 检查obj2中的每个属性
    for (let index = 0; index < mergedObj.length; index++) {
      const element = mergedObj[index];
      let old = obj2.filter(
        (x) =>
          x.product_id == element.product_id &&
          x.promotion_id == element.promotion_id
      );
      if (old && old.length > 0) {
        element.start_apply_time = old[0].start_apply_time;
        element.end_apply_time = old[0].end_apply_time;
        element.end_use_time = old[0].end_use_time;
        element.start_use_time = old[0].start_use_time;
        element.credit = old[0].credit;
        element.total_amount = old[0].total_amount;
        element.min_price = create ? element.min_price : old[0].min_price;
        if (old[0].cos_ratio != element.cos_ratio) {
          //存储疑似变化的佣金
          let hasChange = is_change_goods.find(
            (x) =>
              x.商品编号 == element.product_id &&
              x.现利率 == element.cos_ratio_display
          );
          if (hasChange) {
            if (element.cos_ratio_display == "1%") {
              await unbind(element.product_id);
            }
            console.log("单独", productData);
            changeGoods.push({
              标题: element.title,
              商品编号: element.product_id,
              原利率: old[0].cos_ratio_display,
              现利率: element.cos_ratio_display,
              时间: new Date().toLocaleString(),
            });
            window.localStorage.setItem(
              "changeGoods",
              JSON.stringify(changeGoods)
            );
            document.getElementById("change_data").innerText =
              JSON.stringify(changeGoods);
          } else {
            is_change_goods.push({
              标题: element.title,
              商品编号: element.product_id,
              原利率: old[0].cos_ratio_display,
              现利率: element.cos_ratio_display,
              时间: new Date().toLocaleString(),
            });
          }
        } else {
          is_change_goods = is_change_goods.filter(
            (x) => x.商品编号 != element.product_id
          );
        }
      } else {
        let start = Math.round(new Date().getTime() / 1000);
        let end = getUnixTimestampInXHours(1);
        element.start_apply_time = start;
        element.end_apply_time = end;
        element.end_use_time = end;

        element.start_use_time = start;
        element.credit = 0;
        element.total_amount = 0;
      }
    }

    return mergedObj;
  }

  function getUnixTimestampInXHours(x) {
    // 当前时间的毫秒时间戳
    var now = Date.now();
    // 将x小时转换为毫秒
    var hoursInMilliseconds = x * 60 * 60 * 1000 - 6000;
    // 计算x小时后的时间戳（毫秒）
    var futureTimeMilliseconds = now + hoursInMilliseconds;
    // 转换为Unix时间戳（秒）
    var futureUnixTimestamp = Math.floor(futureTimeMilliseconds / 1000);
    return futureUnixTimestamp;
  }

  // All the content in this article is only for learning and communication use, not for any other purpose, strictly prohibited for commercial use and illegal use, otherwise all the consequences are irrelevant to the author!
  function rc4_encrypt(plaintext, key) {
    var s = [];
    for (var i = 0; i < 256; i++) {
      s[i] = i;
    }
    var j = 0;
    for (var i = 0; i < 256; i++) {
      j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
      var temp = s[i];
      s[i] = s[j];
      s[j] = temp;
    }

    var i = 0;
    var j = 0;
    var cipher = [];
    for (var k = 0; k < plaintext.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      var temp = s[i];
      s[i] = s[j];
      s[j] = temp;
      var t = (s[i] + s[j]) % 256;
      cipher.push(String.fromCharCode(s[t] ^ plaintext.charCodeAt(k)));
    }
    return cipher.join("");
  }

  function le(e, r) {
    return ((e << (r %= 32)) | (e >>> (32 - r))) >>> 0;
  }

  function de(e) {
    return 0 <= e && e < 16
      ? 2043430169
      : 16 <= e && e < 64
      ? 2055708042
      : void console["error"]("invalid j for constant Tj");
  }

  function pe(e, r, t, n) {
    return 0 <= e && e < 16
      ? (r ^ t ^ n) >>> 0
      : 16 <= e && e < 64
      ? ((r & t) | (r & n) | (t & n)) >>> 0
      : (console["error"]("invalid j for bool function FF"), 0);
  }

  function he(e, r, t, n) {
    return 0 <= e && e < 16
      ? (r ^ t ^ n) >>> 0
      : 16 <= e && e < 64
      ? ((r & t) | (~r & n)) >>> 0
      : (console["error"]("invalid j for bool function GG"), 0);
  }

  function reset() {
    (this.reg[0] = 1937774191),
      (this.reg[1] = 1226093241),
      (this.reg[2] = 388252375),
      (this.reg[3] = 3666478592),
      (this.reg[4] = 2842636476),
      (this.reg[5] = 372324522),
      (this.reg[6] = 3817729613),
      (this.reg[7] = 2969243214),
      (this["chunk"] = []),
      (this["size"] = 0);
  }

  function write1(e) {
    var a =
      "string" == typeof e
        ? (function (e) {
            let n = encodeURIComponent(e)["replace"](
                /%([0-9A-F]{2})/g,
                function (e, r) {
                  return String["fromCharCode"]("0x" + r);
                }
              ),
              a = new Array(n["length"]);
            return (
              Array["prototype"]["forEach"]["call"](n, function (e, r) {
                a[r] = e.charCodeAt(0);
              }),
              a
            );
          })(e)
        : e;
    this.size += a.length;
    var f = 64 - this["chunk"]["length"];
    if (a["length"] < f) this["chunk"] = this["chunk"].concat(a);
    else
      for (
        this["chunk"] = this["chunk"].concat(a.slice(0, f));
        this["chunk"].length >= 64;

      )
        this["_compress"](this["chunk"]),
          f < a["length"]
            ? (this["chunk"] = a["slice"](f, Math["min"](f + 64, a["length"])))
            : (this["chunk"] = []),
          (f += 64);
  }

  function sum(e, t) {
    e && (this["reset"](), this["write"](e)), this["_fill"]();
    for (var f = 0; f < this.chunk["length"]; f += 64)
      this._compress(this["chunk"]["slice"](f, f + 64));
    var i = null;
    if (t == "hex") {
      i = "";
      for (f = 0; f < 8; f++) i += se(this["reg"][f]["toString"](16), 8, "0");
    } else
      for (i = new Array(32), f = 0; f < 8; f++) {
        var c = this.reg[f];
        (i[4 * f + 3] = (255 & c) >>> 0),
          (c >>>= 8),
          (i[4 * f + 2] = (255 & c) >>> 0),
          (c >>>= 8),
          (i[4 * f + 1] = (255 & c) >>> 0),
          (c >>>= 8),
          (i[4 * f] = (255 & c) >>> 0);
      }
    return this["reset"](), i;
  }

  function _compress(t) {
    if (t < 64) console.error("compress error: not enough data");
    else {
      for (
        var f = (function (e) {
            for (var r = new Array(132), t = 0; t < 16; t++)
              (r[t] = e[4 * t] << 24),
                (r[t] |= e[4 * t + 1] << 16),
                (r[t] |= e[4 * t + 2] << 8),
                (r[t] |= e[4 * t + 3]),
                (r[t] >>>= 0);
            for (var n = 16; n < 68; n++) {
              var a = r[n - 16] ^ r[n - 9] ^ le(r[n - 3], 15);
              (a = a ^ le(a, 15) ^ le(a, 23)),
                (r[n] = (a ^ le(r[n - 13], 7) ^ r[n - 6]) >>> 0);
            }
            for (n = 0; n < 64; n++) r[n + 68] = (r[n] ^ r[n + 4]) >>> 0;
            return r;
          })(t),
          i = this["reg"].slice(0),
          c = 0;
        c < 64;
        c++
      ) {
        var o = le(i[0], 12) + i[4] + le(de(c), c),
          s = ((o = le((o = (4294967295 & o) >>> 0), 7)) ^ le(i[0], 12)) >>> 0,
          u = pe(c, i[0], i[1], i[2]);
        u = (4294967295 & (u = u + i[3] + s + f[c + 68])) >>> 0;
        var b = he(c, i[4], i[5], i[6]);
        (b = (4294967295 & (b = b + i[7] + o + f[c])) >>> 0),
          (i[3] = i[2]),
          (i[2] = le(i[1], 9)),
          (i[1] = i[0]),
          (i[0] = u),
          (i[7] = i[6]),
          (i[6] = le(i[5], 19)),
          (i[5] = i[4]),
          (i[4] = (b ^ le(b, 9) ^ le(b, 17)) >>> 0);
      }
      for (var l = 0; l < 8; l++)
        this["reg"][l] = (this["reg"][l] ^ i[l]) >>> 0;
    }
  }

  function _fill() {
    var a = 8 * this["size"],
      f = this["chunk"]["push"](128) % 64;
    for (64 - f < 8 && (f -= 64); f < 56; f++) this.chunk["push"](0);
    for (var i = 0; i < 4; i++) {
      var c = Math["floor"](a / 4294967296);
      this["chunk"].push((c >>> (8 * (3 - i))) & 255);
    }
    for (i = 0; i < 4; i++) this["chunk"]["push"]((a >>> (8 * (3 - i))) & 255);
  }

  function SM3() {
    this.reg = [];
    this.chunk = [];
    this.size = 0;
    this.reset();
  }
  SM3.prototype.reset = reset;
  SM3.prototype.write = write1;
  SM3.prototype.sum = sum;
  SM3.prototype._compress = _compress;
  SM3.prototype._fill = _fill;

  function result_encrypt(long_str, num = null) {
    let s_obj = {
      s0: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      s1: "Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
      s2: "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
      s3: "ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe",
      s4: "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe",
    };
    let constant = {
      0: 16515072,
      1: 258048,
      2: 4032,
      str: s_obj[num],
    };

    let result = "";
    let lound = 0;
    let long_int = get_long_int(lound, long_str);
    for (let i = 0; i < (long_str.length / 3) * 4; i++) {
      if (Math.floor(i / 4) !== lound) {
        lound += 1;
        long_int = get_long_int(lound, long_str);
      }
      let temp_int;
      let key = i % 4;
      switch (key) {
        case 0:
          temp_int = (long_int & constant["0"]) >> 18;
          result += constant["str"].charAt(temp_int);
          break;
        case 1:
          temp_int = (long_int & constant["1"]) >> 12;
          result += constant["str"].charAt(temp_int);
          break;
        case 2:
          temp_int = (long_int & constant["2"]) >> 6;
          result += constant["str"].charAt(temp_int);
          break;
        case 3:
          temp_int = long_int & 63;
          result += constant["str"].charAt(temp_int);
          break;
        default:
          break;
      }
    }
    return result;
  }

  function get_long_int(round, long_str) {
    round = round * 3;
    return (
      (long_str.charCodeAt(round) << 16) |
      (long_str.charCodeAt(round + 1) << 8) |
      long_str.charCodeAt(round + 2)
    );
  }

  function gener_random(random, option) {
    return [
      (random & 255 & 170) | (option[0] & 85), // 163
      (random & 255 & 85) | (option[0] & 170), //87
      ((random >> 8) & 255 & 170) | (option[1] & 85), //37
      ((random >> 8) & 255 & 85) | (option[1] & 170), //41
    ];
  }

  //////////////////////////////////////////////
  function generate_rc4_bb_str(
    url_search_params,
    user_agent,
    window_env_str,
    suffix = "cus",
    Arguments = [0, 1, 14]
  ) {
    let sm3 = new SM3();
    let start_time = Date.now();
    /**
     * 进行3次加密处理
     * 1: url_search_params两次sm3之的结果
     * 2: 对后缀两次sm3之的结果
     * 3: 对ua处理之后的结果
     */
    // url_search_params两次sm3之的结果
    let url_search_params_list = sm3.sum(sm3.sum(url_search_params + suffix));
    // 对后缀两次sm3之的结果
    let cus = sm3.sum(sm3.sum(suffix));
    // 对ua处理之后的结果
    let ua = sm3.sum(
      result_encrypt(
        rc4_encrypt(
          user_agent,
          String.fromCharCode.apply(null, [0.00390625, 1, 14])
        ),
        "s3"
      )
    );
    //
    let end_time = Date.now();
    // b
    let b = {
      8: 3, // 固定
      10: end_time, //3次加密结束时间
      15: {
        aid: 6383,
        pageId: 6241,
        boe: false,
        ddrt: 7,
        paths: {
          include: [{}, {}, {}, {}, {}, {}, {}],
          exclude: [],
        },
        track: {
          mode: 0,
          delay: 300,
          paths: [],
        },
        dump: true,
        rpU: "",
      },
      16: start_time, //3次加密开始时间
      18: 44, //固定
      19: [1, 0, 1, 5],
    };

    //3次加密开始时间
    b[20] = (b[16] >> 24) & 255;
    b[21] = (b[16] >> 16) & 255;
    b[22] = (b[16] >> 8) & 255;
    b[23] = b[16] & 255;
    b[24] = (b[16] / 256 / 256 / 256 / 256) >> 0;
    b[25] = (b[16] / 256 / 256 / 256 / 256 / 256) >> 0;

    // 参数Arguments [0, 1, 14, ...]
    // let Arguments = [0, 1, 14]
    b[26] = (Arguments[0] >> 24) & 255;
    b[27] = (Arguments[0] >> 16) & 255;
    b[28] = (Arguments[0] >> 8) & 255;
    b[29] = Arguments[0] & 255;

    b[30] = (Arguments[1] / 256) & 255;
    b[31] = Arguments[1] % 256 & 255;
    b[32] = (Arguments[1] >> 24) & 255;
    b[33] = (Arguments[1] >> 16) & 255;

    b[34] = (Arguments[2] >> 24) & 255;
    b[35] = (Arguments[2] >> 16) & 255;
    b[36] = (Arguments[2] >> 8) & 255;
    b[37] = Arguments[2] & 255;

    // (url_search_params + "cus") 两次sm3之的结果
    /**let url_search_params_list = [
     91, 186,  35,  86, 143, 253,   6,  76,
     34,  21, 167, 148,   7,  42, 192, 219,
     188,  20, 182,  85, 213,  74, 213, 147,
     37, 155,  93, 139,  85, 118, 228, 213
     ]*/
    b[38] = url_search_params_list[21];
    b[39] = url_search_params_list[22];

    // ("cus") 对后缀两次sm3之的结果
    /**
     * let cus = [
     136, 101, 114, 147,  58,  77, 207, 201,
     215, 162, 154,  93, 248,  13, 142, 160,
     105,  73, 215, 241,  83,  58,  51,  43,
     255,  38, 168, 141, 216, 194,  35, 236
     ]*/
    b[40] = cus[21];
    b[41] = cus[22];

    // 对ua处理之后的结果
    /**
     * let ua = [
     129, 190,  70, 186,  86, 196, 199,  53,
     99,  38,  29, 209, 243,  17, 157,  69,
     147, 104,  53,  23, 114, 126,  66, 228,
     135,  30, 168, 185, 109, 156, 251,  88
     ]*/
    b[42] = ua[23];
    b[43] = ua[24];

    //3次加密结束时间
    b[44] = (b[10] >> 24) & 255;
    b[45] = (b[10] >> 16) & 255;
    b[46] = (b[10] >> 8) & 255;
    b[47] = b[10] & 255;
    b[48] = b[8];
    b[49] = (b[10] / 256 / 256 / 256 / 256) >> 0;
    b[50] = (b[10] / 256 / 256 / 256 / 256 / 256) >> 0;

    // object配置项
    b[51] = b[15]["pageId"];
    b[52] = (b[15]["pageId"] >> 24) & 255;
    b[53] = (b[15]["pageId"] >> 16) & 255;
    b[54] = (b[15]["pageId"] >> 8) & 255;
    b[55] = b[15]["pageId"] & 255;

    b[56] = b[15]["aid"];
    b[57] = b[15]["aid"] & 255;
    b[58] = (b[15]["aid"] >> 8) & 255;
    b[59] = (b[15]["aid"] >> 16) & 255;
    b[60] = (b[15]["aid"] >> 24) & 255;

    // 中间进行了环境检测
    // 代码索引:  2496 索引值:  17 （索引64关键条件）
    // '1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32'.charCodeAt()得到65位数组
    /**
     * let window_env_list = [49, 53, 51, 54, 124, 55, 52, 55, 124, 49, 53, 51, 54, 124, 56, 51, 52, 124, 48, 124, 51,
     * 48, 124, 48, 124, 48, 124, 49, 53, 51, 54, 124, 56, 51, 52, 124, 49, 53, 51, 54, 124, 56,
     * 54, 52, 124, 49, 53, 50, 53, 124, 55, 52, 55, 124, 50, 52, 124, 50, 52, 124, 87, 105, 110,
     * 51, 50]
     */
    let window_env_list = [];
    for (let index = 0; index < window_env_str.length; index++) {
      window_env_list.push(window_env_str.charCodeAt(index));
    }
    b[64] = window_env_list.length;
    b[65] = b[64] & 255;
    b[66] = (b[64] >> 8) & 255;

    b[69] = [].length;
    b[70] = b[69] & 255;
    b[71] = (b[69] >> 8) & 255;

    b[72] =
      b[18] ^
      b[20] ^
      b[26] ^
      b[30] ^
      b[38] ^
      b[40] ^
      b[42] ^
      b[21] ^
      b[27] ^
      b[31] ^
      b[35] ^
      b[39] ^
      b[41] ^
      b[43] ^
      b[22] ^
      b[28] ^
      b[32] ^
      b[36] ^
      b[23] ^
      b[29] ^
      b[33] ^
      b[37] ^
      b[44] ^
      b[45] ^
      b[46] ^
      b[47] ^
      b[48] ^
      b[49] ^
      b[50] ^
      b[24] ^
      b[25] ^
      b[52] ^
      b[53] ^
      b[54] ^
      b[55] ^
      b[57] ^
      b[58] ^
      b[59] ^
      b[60] ^
      b[65] ^
      b[66] ^
      b[70] ^
      b[71];
    let bb = [
      b[18],
      b[20],
      b[52],
      b[26],
      b[30],
      b[34],
      b[58],
      b[38],
      b[40],
      b[53],
      b[42],
      b[21],
      b[27],
      b[54],
      b[55],
      b[31],
      b[35],
      b[57],
      b[39],
      b[41],
      b[43],
      b[22],
      b[28],
      b[32],
      b[60],
      b[36],
      b[23],
      b[29],
      b[33],
      b[37],
      b[44],
      b[45],
      b[59],
      b[46],
      b[47],
      b[48],
      b[49],
      b[50],
      b[24],
      b[25],
      b[65],
      b[66],
      b[70],
      b[71],
    ];
    bb = bb.concat(window_env_list).concat(b[72]);
    return rc4_encrypt(
      String.fromCharCode.apply(null, bb),
      String.fromCharCode.apply(null, [121])
    );
  }

  function generate_random_str() {
    let random_str_list = [];
    random_str_list = random_str_list.concat(
      gener_random(Math.random() * 10000, [3, 45])
    );
    random_str_list = random_str_list.concat(
      gener_random(Math.random() * 10000, [1, 0])
    );
    random_str_list = random_str_list.concat(
      gener_random(Math.random() * 10000, [1, 5])
    );
    return String.fromCharCode.apply(null, random_str_list);
  }

  function generate_a_bogus(url_search_params) {
    /**
     * url_search_params："device_platform=webapp&aid=6383&channel=channel_pc_web&update_version_code=170400&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=123.0.0.0&browser_online=true&engine_name=Blink&engine_version=123.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7362810250930783783&msToken=VkDUvz1y24CppXSl80iFPr6ez-3FiizcwD7fI1OqBt6IICq9RWG7nCvxKb8IVi55mFd-wnqoNkXGnxHrikQb4PuKob5Q-YhDp5Um215JzlBszkUyiEvR"
     *
     */
    let user_agent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    let result_str =
      generate_random_str() +
      generate_rc4_bb_str(
        url_search_params,
        user_agent,
        "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32"
      );
    return result_encrypt(result_str, "s4") + "=";
  }
})();
