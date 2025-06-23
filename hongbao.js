// ==UserScript==
// @name         红包插件
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

  //佣金变化商品
  let changeGoods = [];

  //生效中的红包
  let allRedBag = [];

  let i = 3;

  let time = 1;
  //是否发券
  let ratio = 0.8;

  let ready4delete = {};

  let operateData = [
    "左上角领红包，立拍立减",
    "小黄车里都是官旗正品，可以放心购买哦~",
    "全部给给位宝子安排有运费险，有需要的可以放心去拍",
    "欢迎新进直播间的宝子~",
    "点点关注不迷路，持续上新哦~",
    "官旗发货，保证正品，假一罚四！",
    "领完红包在下单，红包在左上角~",
  ];

  //获取生效中的红包
  //<div style="background: #fef0f0; padding: 10px; border-radius: 6px;">
  //<span style="color: #666;">使用数量：</span>
  //<span class="data_item" style="color: #e4393c; font-weight: bold;">${data.used_amount}</span>
  //</div>
  async function getExistRedbag() {
    let response = await fetch(
      `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/list?_bid=mcenter_buyin&redpack_type=11&page=1&size=20`
    );
    if (!response.ok) {
      throw new Error("获取红包失败");
    }

    const data = await response.json();
    let result = data?.data;
    if (!result) {
      throw new Error("获取红包失败");
    }

    if (result && result.data.length > 0) {
      let beforeTime = document.getElementById("beforeTime").value;
      if (!beforeTime) {
        showModal("请先填写等待时间！");
        return;
      }
      let notexpired = result.data.filter(
        (x) =>
          x.redpacket_activity.activity_status != 3 &&
          x.redpacket_meta_list[0].valid_end_time * 1000 -
          parseInt(beforeTime) * 60 * 1000 >
          new Date().getTime()
      );
      if (notexpired && notexpired.length > 0) {
        let data = notexpired[0]?.redpacket_meta_list[0];
        if (data.redpacket_meta_status == 5) {
          document.getElementById("allred").innerHTML = "暂无红包";

          return [];
        }
        if (!data) {
          document.getElementById("allred").innerHTML = "获取红包失败";

          throw new Error("获取红包失败");
        }
        let date1 = getDate(data.display_time * 1000);
        let date2 = getDate(data.end_apply_time * 1000);
        let date3 = getDate(data.valid_end_time * 1000);
        document.getElementById("allred").innerHTML = `<div class="data_bag" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 18px; color: #e4393c; text-align: center; margin-bottom: 15px; font-weight: bold;">红包详情</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div style="background: #fef0f0; padding: 10px; border-radius: 6px;">
              <span style="color: #666;">总数量：</span>
              <span class="data_item" style="color: #e4393c; font-weight: bold;">${data.total_amount}</span>
            </div>
            <div style="background: #fef0f0; padding: 10px; border-radius: 6px;">
              <span style="color: #666;">总金额：</span>
              <span class="data_item" style="color: #e4393c; font-weight: bold;">¥${data.total_credit / 100}</span>
            </div>
            <div style="background: #fef0f0; padding: 10px; border-radius: 6px;">
              <span style="color: #666;">单个金额：</span>
              <span class="data_item" style="color: #e4393c; font-weight: bold;">¥${data.avg_credit / 100}</span>
            </div>
            <div style="background: #fef0f0; padding: 10px; border-radius: 6px;">
              <span style="color: #666;">领取数量：</span>
              <span class="data_item" style="color: #e4393c; font-weight: bold;">${data.received_amount}</span>
            </div>
          
          </div>
          <div style="margin-top: 15px; border-top: 1px dashed #ddd; padding-top: 15px;">
            <div style="margin-bottom: 8px; color: #666;">
              <i style="display: inline-block; width: 8px; height: 8px; background: #e4393c; border-radius: 50%; margin-right: 8px;"></i>
              预热开始时间：<span class="data_item" style="color: #333;">${date1}</span>
            </div>
            <div style="margin-bottom: 8px; color: #666;">
              <i style="display: inline-block; width: 8px; height: 8px; background: #e4393c; border-radius: 50%; margin-right: 8px;"></i>
              开抢结束时间：<span class="data_item" style="color: #333;">${date2}</span>
            </div>
            <div style="color: #666;">
              <i style="display: inline-block; width: 8px; height: 8px; background: #e4393c; border-radius: 50%; margin-right: 8px;"></i>
              使用结束时间：<span class="data_item" style="color: #333;">${date3}</span>
            </div>
          </div>
        </div>`;
        return notexpired;
      } else {
        document.getElementById("allred").innerHTML = "暂无红包";
        return [];
      }
    } else {
      document.getElementById("allred").innerHTML = "暂无红包";
      return [];
    }
  }

  function getDate(timestamp) {
    // 假设你有一个时间戳

    // 创建一个新的Date对象
    var date = new Date(timestamp);

    // 你也可以使用其他方法来格式化日期
    var year = date.getFullYear(); // 获取年份
    var month = date.getMonth() + 1; // 获取月份，月份是从0开始的，所以需要+1
    var day = date.getDate(); // 获取日期
    var hours = date.getHours(); // 获取小时
    var minutes = date.getMinutes(); // 获取分钟
    var seconds = date.getSeconds(); // 获取秒数

    // 可以按照需要组合这些值来创建自定义格式的日期字符串
    var customDateString =
      year +
      "-" +
      month.toString().padStart(2, "0") +
      "-" +
      day.toString().padStart(2, "0") +
      " " +
      hours.toString().padStart(2, "0") +
      ":" +
      minutes.toString().padStart(2, "0") +
      ":" +
      seconds.toString().padStart(2, "0");
    return customDateString;
  }

  async function check() {
    let response = await fetch(
      "https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/promotion_list?_bid=mcenter_buyin&promotion_name_or_id=&page=1&size=200&search_type=1"
    );
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    let productInfo = data.data.data;
    let single_redbag = document.getElementById("single_redbag").value;
    let errorData = [];
    for (let index = 0; index < productInfo.length; index++) {
      const item = productInfo[index];
      if (
        item.cos_ratio > 1 &&
        (item.min_price / 100) * (item.cos_ratio / 100) + i > single_redbag
      ) {
      } else {
        errorData.push(item.product_id);
      }
    }
    if (errorData.length > 0) {
      return false;
    } else {
      return true;
    }
  }

  async function checkData() {
    let response = await fetch(
      "https://buyin.jinritemai.com/api/buyin/marketing/anchor_coupon/promotion_list?_bid=mcenter_buyin&promotion_name_or_id=&page=1&size=200&search_type=1"
    );
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    let productInfo = data.data.data;
    let single_redbag = document.getElementById("single_redbag").value;
    for (let index = 0; index < productInfo.length; index++) {
      const item = productInfo[index];
      if (
        item.cos_ratio > 1 &&
        (item.min_price / 100) * (item.cos_ratio / 100) + i > single_redbag
      ) {
        if (ready4delete[item.product_id]) {
          ready4delete[item.product_id] = 0;
        }
      } else {
        if (ready4delete[item.product_id]) {
          ready4delete[item.product_id] = ready4delete[item.product_id] + 1;
          if (ready4delete[item.product_id] > 4) {
            await deleteProduct(item.promotion_id);
            await deleteShopProduct(item.promotion_id);
          }
        } else {
          ready4delete[item.product_id] = 1;
        }
      }
    }
    document.getElementById("out_data").innerText = Object.keys(
      ready4delete
    ).filter((key) => ready4delete[key] > 0 && ready4delete[key] < 5);
  }
  async function deleteProduct(id) {
    //https://buyin.jinritemai.com/pc/live/unbind  POST
    //     {
    //   "promotions": [
    //     {
    //       "promotion_id": "3706661892920637376"
    //     }
    //   ]
    // }
    let response = await fetch("https://buyin.jinritemai.com/pc/live/unbind", {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promotions: [
          {
            promotion_id: id,
          },
        ],
      }), // 数据体
    });
    let ss = await response.json();
    if (ss.code == 0) {
      //删除成功
      document.getElementById("deleteproduct").append("," + id);
      return true;
    } else {
      return false;
    }
  }

  async function deleteShopProduct(id) {
    let response = await fetch(
      " https://buyin.jinritemai.com/api/anchor/shop/unbind",
      {
        method: "POST", // 或者 'PUT'
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotion_id: id,
        }), // 数据体
      }
    );
    let ss = await response.json();
    if (ss.code == 0) {
      //删除成功

      return true;
    } else {
      return false;
    }
  }

  //发红包
  async function setAnchorCoupon() {
    try {
      let exist = await getExistRedbag();
      if (exist.length > 0) {
        showModal("当前有生效中的红包，停止发送！");
        return;
      }
      let useTime = document.getElementById("useTime").value;
      if (!useTime) {
        showModal("请先填写有效时间！");
        return;
      }
      let single_redbag = document.getElementById("single_redbag").value;
      if (!single_redbag) {
        showModal("请先红包金额！");
        return;
      }
      let num_redbag = document.getElementById("num_redbag").value;
      if (!num_redbag || parseInt(num_redbag) < 20) {
        showModal("请先填写红包数量并且需要大于20！");
        return;
      }
      let beforeTime = document.getElementById("beforeTime").value;
      if (!beforeTime) {
        showModal("请先填写等待时间！");
        return;
      }
      if (parseInt(single_redbag) * parseInt(num_redbag) < 100) {
        showModal("红包总金额需要大于100！");
        return;
      }
      let checkData = await check();
      if (!checkData) {
        document.getElementById("allred").innerHTML =
          "暂停发送！商品佣金低于红包金额，请及时处理！";

        return;
      }
      let currentTime = Math.floor(new Date().getTime() / 1000);
      let valid_start_time = currentTime; //开始时间
      let valid_end_time =
        currentTime +
        parseInt(useTime) * 60 +
        parseInt(beforeTime) * 60 +
        parseInt(beforeTime) * 60 +
        7; //结束时间

      let url = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/create?_bid=mcenter_buyin`;
      let data = {
        redpacket_data: {
          redpacket_activity: {
            activity_biz_type: 1,
            redpacket_activity_name:
              "普通倒计时" +
              new Date().getFullYear() +
              new Date().getMonth() +
              new Date().getDate(),
            max_apply_times: 1,
            validity_type: 1,
            live_redpack_activity_sub_type: 3,
            kol_user_tag: 0,
            redpacket_sub_type: 1,
            redpack_type: 11,
            valid_start_time: valid_start_time,
            valid_end_time: valid_end_time,
            total_credit: parseInt(single_redbag) * parseInt(num_redbag) * 100,
          },
          redpacket_meta_list: [
            {
              total_amount: parseInt(num_redbag),
              total_credit:
                parseInt(single_redbag) * parseInt(num_redbag) * 100,
              credit_type: 1,
              extra_info: {
                strategy_goal: 0,
              },
              avg_credit: parseInt(single_redbag) * 100,
            },
          ],
        },
      };
      let response = await fetch(url, {
        method: "POST", // 或者 'PUT'
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // 数据体
      });
      let ss = await response.json();
      if (ss.code == 0) {
        //验证红包

        let verifyUrl = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/check_display_time?_bid=mcenter_buyin`;
        const formData = new URLSearchParams();
        formData.append("redpacket_activity_id", ss.data.redpacket_activity_id);
        formData.append("display_time_type", 1);
        formData.append("redpack_type", 11);

        formData.append("period_display_after_now", parseInt(beforeTime) * 60);
        formData.append("apply_period", parseInt(useTime) * 60);

        let response = await fetch(verifyUrl, {
          method: "POST", // 或者 'PUT'
          headers: {
            "Content-Type": "application/x-www-form-urlencoded", // 告诉服务器数据体的格式
          },
          body: formData.toString(),
        });
        let verifyBag = await response.json();
        console.log(verifyBag);
        if (verifyBag.code == 0) {
          //验证红包

          let useUrl = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/edit_display_time?_bid=mcenter_buyin`;
          const formData = new URLSearchParams();
          formData.append(
            "redpacket_activity_id",
            ss.data.redpacket_activity_id
          );
          formData.append("display_time_type", 1);
          formData.append("redpack_type", 11);

          formData.append(
            "period_display_after_now",
            parseInt(beforeTime) * 60
          );
          formData.append("apply_period", parseInt(useTime) * 60);

          let response = await fetch(useUrl, {
            method: "POST", // 或者 'PUT'
            headers: {
              "Content-Type": "application/x-www-form-urlencoded", // 告诉服务器数据体的格式
            },
            body: formData.toString(),
          });
          let useBag = await response.json();
          console.log(useBag);
          if (useBag.code == 0) {
            await getExistRedbag();
            unbind();
          } else {
            showModal(JSON.stringify("红包验证失败，等待重新发送"));
            return;
          }
        } else {
          showModal("红包投放失败，等待重新发送");
          return;
        }
        //投放红包
      } else {
        showModal(JSON.stringify(ss));
        return;
      }
      return ss;
    } catch (e) {
      showModal(JSON.stringify(e));
      return;
    }
  }

  let taskTimer;
  let isTaskRunning = false;
  //开启循环任务
  async function scheduleTask() {
    // console.log("start...");
    if (isTaskRunning) return; // 如果任务正在运行，则直接返回，避免并发执行
    isTaskRunning = true;
    try {
      await checkData();
      let exist = await getExistRedbag();
      if (exist.length > 0) {
        throw new Error("有生效的红包，继续等待");
      }
      await setAnchorCoupon();
    } catch (error) {
      // console.log(`本次发放${count}张券`);
      console.log("任务执行时发生错误:", error);
    } finally {
      isTaskRunning = false; // 任务执行完毕，重置标志
      const interval = 5000; // 等一秒继续执行

      taskTimer = setTimeout(async () => {
        await scheduleTask();
      }, interval);
    }
  }

  //弹幕
  async function operate() {
    let url = `https://buyin.jinritemai.com/api/anchor/comment/operate`;

    let data = operateData;
    let editOperateData = window.localStorage.getItem("operateData");
    if (editOperateData) {
      data = JSON.parse(editOperateData);
    }
    let response = await fetch(url, {
      method: "POST", // 或者 'PUT'
      headers: {
        "Content-Type": "application/json", // 告诉服务器数据体的格式
      },
      body: JSON.stringify({
        operate_type: 2,
        content: data[Math.floor(Math.random() * 5)],
      }), // 数据体
    });
    let ss = await response.json();
    if (ss.msg == "参数前置校验未通过") {
      return;
    }
    return ss;
  }

  //作废
  async function unbind() {
    let response = await fetch(
      `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/list?_bid=mcenter_buyin&redpack_type=11&page=1&size=20&activity_status=3`
    );
    if (!response.ok) {
      showModal("获取红包失败");

      return;
    }

    const data = await response.json();
    let result = data?.data;
    if (!result) {
      showModal("获取红包失败");
      return;
    }

    if (result && result.data.length > 0) {
      for (let index = 0; index < result.data.length; index++) {
        const element = result.data[index];
        let url = `https://buyin.jinritemai.com/api/buyin/marketing/anchor_redpacket/update_status?_bid=mcenter_buyin`;

        const formData = new URLSearchParams();
        formData.append(
          "redpacket_activity_id",
          element.redpacket_activity.redpacket_activity_id
        );
        formData.append("activity_status", 5);
        formData.append("redpack_type", 11);

        let response = await fetch(url, {
          method: "POST", // 或者 'PUT'
          headers: {
            "Content-Type": "application/x-www-form-urlencoded", // 告诉服务器数据体的格式
          },
          body: formData.toString(),
        });
        let ss = await response.json();
        if (ss.code == 0) {
          showModal(
            "作废成功" + element.redpacket_activity.redpacket_activity_id
          );
        } else {
          showModal("作废失败：" + ss.msg);
        }
      }
    }
    return "";
  }

  //创建页面操作元素=====================================================================

  // 弹窗父元素
  var divElement = document.createElement("div");
  divElement.style.position = "fixed";
  divElement.style.bottom = "100px";
  divElement.style.left = "20px";
  divElement.style.backgroundColor = "#fff";
  divElement.style.padding = "15px";
  divElement.style.borderRadius = "8px";
  divElement.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
  divElement.style.zIndex = "99999999";

  // 左下角按钮
  var buttonElement = document.createElement("button");
  buttonElement.id = "open_modal_red";
  buttonElement.innerHTML = "红包助手";
  buttonElement.style.cursor = "pointer";
  buttonElement.style.backgroundColor = "#FF4D4F";
  buttonElement.style.border = "none";
  buttonElement.style.color = "white";
  buttonElement.style.padding = "12px 24px";
  buttonElement.style.textAlign = "center";
  buttonElement.style.textDecoration = "none";
  buttonElement.style.display = "inline-block";
  buttonElement.style.fontSize = "16px";
  buttonElement.style.fontWeight = "500";
  buttonElement.style.margin = "4px 2px";
  buttonElement.style.borderRadius = "6px";
  buttonElement.style.transition = "all 0.3s ease";
  buttonElement.style.boxShadow = "0 2px 6px rgba(255,77,79,0.4)";

  // 按钮悬停效果
  buttonElement.onmouseover = function () {
    this.style.backgroundColor = "#FF7875";
    this.style.transform = "translateY(-2px)";
  };
  buttonElement.onmouseout = function () {
    this.style.backgroundColor = "#FF4D4F";
    this.style.transform = "translateY(0)";
  };

  // 将按钮添加到div中
  divElement.appendChild(buttonElement);

  // 将div添加到body中
  document.body.appendChild(divElement);

  // 表单内容
  var modalForm = document.createElement("div");
  modalForm.id = "model";
  modalForm.style.position = "fixed";
  modalForm.style.top = "50%";
  modalForm.style.left = "50%";
  modalForm.style.transform = "translate(-50%, -50%)";
  modalForm.style.padding = "20px";
  modalForm.style.width = "600px";
  modalForm.style.height = "900px";
  modalForm.style.backgroundColor = "#fff";
  modalForm.style.borderRadius = "12px";
  modalForm.style.boxShadow = "0 3px 20px rgba(0,0,0,0.2)";
  modalForm.style.zIndex = "9999";
  modalForm.innerHTML = `
    <style>
    .data_bag{
      font-size: 20px;
      color: #333;
    }
    .data_item{
      font-size: 22px;
      font-weight: 500;
    }
    .product-container {
      height: 490px;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      background: #fafafa;
      border-radius: 8px;
    }
    .yongjin-container {
      height: 100px;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      background: #fafafa;
      border-radius: 8px;
    }
    .readonly-input {
      background-color: #f5f5f5;
      color: #666;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      padding: 8px;
    }
    .product-image {
      width: 90px;
      height: 90px;
      object-fit: cover;
      margin-right: 20px;
      border-radius: 8px;
    }
    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .product-info > * {
      margin-bottom: 8px;
    }
    .product-inputs {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .product-inputs input {
      padding: 8px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      transition: all 0.3s;
    }
    .product-inputs input:focus {
      border-color: #40a9ff;
      box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
      outline: none;
    }
    .query-price {
      padding: 6px 12px;
      border: none;
      color: #1890ff;
      cursor: pointer;
      background: transparent;
      transition: color 0.3s;
    }
    .query-price:hover {
      color: #40a9ff;
    }
    .product-profit {
      color: #f5222d;
      font-weight: 500;
    }
    .issend {
      color: #f5222d;
      font-weight: 500;
    }
    .sendCoupon {
      color: #1890ff;
      cursor: pointer;
      text-decoration: none;
    }
    .sendCoupon:hover {
      color: #40a9ff;
    }
    .full-width-button {
      display: block;
      width: 95%;
      padding: 12px 20px;
      margin-top: 15px;
      border-radius: 6px;
      border: none;
      background-color: #52c41a;
      color: white;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
    }
    .full-width-button:hover {
      background-color: #73d13d;
      transform: translateY(-2px);
    }
    .product-item {
      display: flex;
      border-bottom: 1px solid #f0f0f0;
      padding: 15px;
      margin-bottom: 15px;
      background: white;
      border-radius: 8px;
      transition: all 0.3s;
    }
    .product-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.09);
    }
    .product-item img {
      width: 90px;
      height: 90px;
      object-fit: cover;
      margin-right: 20px;
      border-radius: 8px;
    }
    .priduct-name {
      display: inline-block;
      width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #262626;
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
      background-color: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
    }
    .modal-content {
      background-color: #fff;
      margin: 15% auto;
      padding: 25px;
      border: none;
      border-radius: 12px;
      width: 80%;
      box-shadow: 0 3px 20px rgba(0,0,0,0.2);
    }
    .close {
      color: #999;
      float: right;
      font-size: 28px;
      font-weight: bold;
      transition: color 0.3s;
    }
    .close:hover,
    .close:focus {
      color: #333;
      text-decoration: none;
      cursor: pointer;
    }
    .expire-text {
      font-size: 13px;
      font-weight: 300;
      color: #8c8c8c;
    }
    #out_data {
      word-wrap: break-word;
      padding: 10px;
      background: #fafafa;
      border-radius: 6px;
    }
    #deleteproduct {
      word-wrap: break-word;
      padding: 10px;
      background: #fafafa;
      border-radius: 6px;
    }
    select {
      height: 40px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 0 10px;
      background: white;
      cursor: pointer;
    }
    select:focus {
      border-color: #40a9ff;
      box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
      outline: none;
    }
    button {
      transition: all 0.3s;
    }
    button:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }
    </style>
    <div>
   <h2 style="text-align: center;cursor: pointer;color:#262626;font-size: 24px;font-weight: 600;margin: 20px 0;text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">红包助手 +qq1246050820<span class='expire-text' style="margin-left: 10px;">span id='data-expireTime_1'></span></span></h2>
    <!-- 为label和input添加一个包装容器 -->
    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
        <div style="flex: 1; min-width: 45%;">
            <label for="modalInput" style="margin-bottom: 8px;color:#262626;">单个红包金额：</label>
            <input type="text" id="single_redbag" style="height: 40px; border-radius: 6px; border: 1px solid #d9d9d9;padding: 0 15px; width: 100%;" placeholder="输入单个红包金额">
        </div>
        <div style="flex: 1; min-width: 45%;">
            <label for="modalInput" style="margin-bottom: 8px;color:#262626;">红包数量：</label>
            <input type="text" id="num_redbag" style="height: 40px; border-radius: 6px; border: 1px solid #d9d9d9;padding: 0 15px; width: 100%;" placeholder="输入红包数量">
        </div>
        <div id="unitbag"></div>
        <div style="flex: 1; min-width: 45%;">
            <label for="modalInput" style="margin-bottom: 8px;color:#262626;">等待时间(分钟)：</label>
            <select id="beforeTime" style="width: 100%;">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option> 
                <option value="6">6</option> 
                <option value="7">7</option> 
                <option value="8">8</option> 
                <option value="9">9</option> 
                <option value="10">10</option> 
            </select> 
        </div>
        <div style="flex: 1; min-width: 45%;">
            <label for="modalInput" style="margin-bottom: 8px;color:#262626;">领取时间(分钟)：</label>
            <select id="useTime" style="width: 100%;">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="10">10</option>
                <option value="30">30</option>
                <option value="60">60</option> 
                <option value="10">10</option> 
                <option value="20">20</option> 
                <option value="30">30</option> 
            </select>
        </div>
    </div>
    <div style="display: flex; justify-content: space-around; margin-top: 20px;gap: 10px;">
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;" id="start_send_red">循环发送</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#ff4d4f;color:#fff;border:none;font-weight:500;" id="stop_send_red">暂停发送</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;" id="refresh_redbag">刷新红包</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;" id="set_unbind_red">一键作废</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#ff4d4f;color:#fff;border:none;font-weight:500;display:none;" id="setcurrent_ing_red">弹幕中</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;" id="setcurrent_red">循环弹幕</button>
      <button style="flex: 1;padding: 12px;border-radius: 6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;" id="send_single_red">单个红包</button>
    </div>
    <div style="margin-top: 20px;color:#262626;font-weight:500;">佣金低于红包的商品：</div>
    <div id="out_data"></div>
    <hr style="margin: 20px 0;border:none;border-top:1px solid #f0f0f0;" />
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="color:#262626;font-weight:500;">已删除商品：</span>
      <button id="cleanchange_red" style="padding:8px 16px;border-radius:6px;background-color:#1890ff;color:#fff;border:none;font-weight:500;">清除</button>
    </div>
    <div id="deleteproduct"></div>
    <hr style="margin: 20px 0;border:none;border-top:1px solid #f0f0f0;" />
    <div id="allred" style="height: 270px;"></div>
    </div>
    <div class="setting" id="setting" style="padding:20px;background:#fafafa;border-radius:8px;margin-top:20px;">
      <div style="font-weight:500;color:#262626;margin-bottom:15px;">弹幕设置</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input type="text" id="operate1" style="height:40px;border-radius:6px;border:1px solid #d9d9d9;padding:0 15px;width:100%" placeholder="弹幕一">
        <input type="text" id="operate2" style="height:40px;border-radius:6px;border:1px solid #d9d9d9;padding:0 15px;width:100%" placeholder="弹幕二">
        <input type="text" id="operate3" style="height:40px;border-radius:6px;border:1px solid #d9d9d9;padding:0 15px;width:100%" placeholder="弹幕三">
        <input type="text" id="operate4" style="height:40px;border-radius:6px;border:1px solid #d9d9d9;padding:0 15px;width:100%" placeholder="弹幕四">
        <input type="text" id="operate5" style="height:40px;border-radius:6px;border:1px solid #d9d9d9;padding:0 15px;width:100%" placeholder="弹幕五">
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button id="save_setting" style="flex:1;height:40px;background-color:#1890ff;color:#fff;border:none;border-radius:6px;font-weight:500;">保存并开始</button>
          <button id="close_setting" style="flex:1;height:40px;background-color:#8c8c8c;color:#fff;border:none;border-radius:6px;font-weight:500;">关闭</button>
        </div>
      </div>
    </div>
    <div id="myModal_red" class="modal2">
      <div class="modal-content">
        <span class="close">&times;</span>
        <p id="modalText_red" style="color:#262626;">这里是一条消息</p>
      </div>
    </div>
    `;
  document.body.appendChild(modalForm);

  //默认隐藏弹窗
  modalForm.style.display = "none";
  //隐藏停止发券按钮
  document.getElementById("stop_send_red").style.display = "none";
  document.getElementById("setting").style.display = "none";

  document
    .getElementById("open_modal_red")
    .addEventListener("click", function () {
      if (modalForm.style.display == "none") {
        // let res = await runAsync("http://47.101.146.35:9004/api/led/Online", "GET")
        //BUYIN_USER_LOGIN_STORAGE
        let currentUser = window.localStorage.getItem(
          "BUYIN_USER_LOGIN_STORAGE"
        );
        if (!currentUser) {
          alert("请先登录再试");
          return;
        }
        modalForm.style.display = "block";
        console.log(res);
      } else {
        modalForm.style.display =
          modalForm.style.display == "none" || !modalForm.style.display
            ? "block"
            : "none";
      }
      // 处理点击事件的代码
    });

  //刷新红包
  document
    .getElementById("refresh_redbag")
    .addEventListener("click", function () {
      getExistRedbag();
    });

  // //清楚佣金变化数据
  // document.getElementById("unbind").addEventListener("click", async function () {
  //   await unbind("3540558159221508849")
  // });
  //更新商品
  document
    .getElementById("set_unbind_red")
    .addEventListener("click", async function () {
      unbind();
    });

  let write;
  //开始讲解
  document
    .getElementById("setcurrent_red")
    .addEventListener("click", async function () {
      document.getElementById("allred").style.display = "none";
      document.getElementById("setting").style.display = "block";
      let res = window.localStorage.getItem("operateData");
      if (res) {
        let data = JSON.parse(res)
        document.getElementById("operate1").value = data[0]
        document.getElementById("operate2").value = data[1]
        document.getElementById("operate3").value = data[2]
        document.getElementById("operate4").value = data[3]
        document.getElementById("operate5").value = data[4]

      }
    });

  document
    .getElementById("save_setting")
    .addEventListener("click", async function () {
      let operate1 = document.getElementById("operate1").value;

      let operate2 = document.getElementById("operate2").value;
      let operate3 = document.getElementById("operate3").value;
      let operate4 = document.getElementById("operate4").value;
      let operate5 = document.getElementById("operate5").value;
      window.localStorage.setItem("operateData", JSON.stringify([
        operate1,
        operate2,
        operate3,
        operate4,
        operate5,
      ]));
      document.getElementById("setcurrent_red").style.display = "none";
      document.getElementById("setcurrent_ing_red").style.display = "block";
      document.getElementById("allred").style.display = "block";
      document.getElementById("setting").style.display = "none";
      operate();
      write = setInterval(() => {
        operate();
      }, 1000 * 60);
    });
  document
    .getElementById("close_setting")
    .addEventListener("click", async function () {
      document.getElementById("allred").style.display = "block";
      document.getElementById("setting").style.display = "none";
      write = setInterval(() => {
        operate();
      }, 1000 * 60);
    });

  //暂停讲解
  document
    .getElementById("setcurrent_ing_red")
    .addEventListener("click", async function () {
      document.getElementById("setcurrent_ing_red").style.display = "none";
      document.getElementById("setcurrent_red").style.display = "block";
      clearInterval(write);
    });

  //循环发券 并监听佣金变化
  document
    .getElementById("start_send_red")
    .addEventListener("click", async function () {
      let currentUser = window.localStorage.getItem("BUYIN_USER_LOGIN_STORAGE");
      if (!currentUser) {
        modalForm.style.display = "none";
        alert("请先登录再试");
        return;
      }

      document.getElementById("start_send_red").style.display = "none";
      document.getElementById("stop_send_red").style.display = "block";
      scheduleTask();
    });

  document
    .getElementById("send_single_red")
    .addEventListener("click", async function () {
      setAnchorCoupon();
    });

  //停止发券
  document
    .getElementById("stop_send_red")
    .addEventListener("click", function () {
      document.getElementById("start_send_red").style.display = "block";
      document.getElementById("stop_send_red").style.display = "none";
      isTaskRunning = false;

      if (taskTimer) {
        clearTimeout(taskTimer);
        showModal("停止发红包");
      }
      //todo....
    });

  //创建页面操作元素结束=====================================================================
  document
    .getElementById("cleanchange_red")
    .addEventListener("click", function () {
      document.getElementById("deleteproduct").innerHTML = "";
    });
  // 发送JSONP请求
  function sendJsonpRequest(urls) {
    const script = document.createElement("script");
    const url = urls;
    script.src = url;
    document.head.appendChild(script);
  }


  // 动态生成提示框的函数
  function showModal(message) {
    // 获取模态框和消息显示元素
    var modal = document.getElementById("myModal_red");
    var modalText = document.getElementById("modalText_red");

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
})();
