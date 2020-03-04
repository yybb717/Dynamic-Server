var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function(request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);
  const session = JSON.parse(fs.readFileSync("./session.json").toString());

  if (path === "/register" && method === "POST") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", chunk => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string);
      const lastUser = userArray[userArray.length - 1];
      const newUser = {
        // id 为最后一个用户的 id + 1
        id: lastUser ? lastUser.id + 1 : 1,
        name: obj.name,
        password: obj.password
      };
      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
      response.end();
    });
  } else if (path === "/sign_in" && method === "POST") {
    //一、读数据库
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    //二、获取请求体里的数据：name和password
    //声明一个数组
    const array = [];
    //监听请求的上传事件，把里面的chunk数据push到数组，因为数据可能是一点一点上传的。那你每上传一点我就把你这一点push到这个数组
    request.on("data", chunk => {
      array.push(chunk);
    });
    //监听请求的结束事件，先把array里的数据变成字符串，这个字符串符合JSON语法，因为请求的时候设置了啊。然后在把字符串变成js对象
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string); // 请求体里的数据：name password
      //三、对比数据库里的数据
      //从数据库数组里找到和请求体数据一样的那个元素，找不到就是undefined
      const user = userArray.find(
        user => user.name === obj.name && user.password === obj.password
      );
      //找不到，那状态码就算404，请求失败
      if (user === undefined) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json; charset=utf-8");
        response.end('{"errorCode":4001}');
        response.end();
      } else {
        //否则
        response.statusCode = 200;
        response.end();
        const random = Math.random(); //生成一个随机数
        session[random] = { user_id: user.id }; //给session对象新加一个属性，属性名是随机数，属性值是{ user_id:从数据库中找到的那个用户的id  }
        fs.writeFileSync("./session.json", JSON.stringify(session)); //再把新session写回session文件中去
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`); //在发现用户名密码正确，找到了数据库中对应用户时，之后立马发门票，门票内容是session_id=前面那个随机数
        //也就是服务器给浏览器发的cookie是个我已经保存好的随机数
        response.end();
      }
    });
  } else if (path === "/home") {
    // 写不出来
    const cookie = request.headers["cookie"]; //获取请求里的Cookie
    let sessionId;
    try {
      //尝试：从门票内容里面提取出随机数。命名为sessionId
      sessionId = cookie
        .split(";")
        .filter(s => s.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
    } catch (error) {}
    if (sessionId && session[sessionId]) {
      //如果cookie里确实有随机数，而且session对象里也确实有叫随机数的属性（值是真正的用户id）
      const userId = session[sessionId].user_id; //提取出用户id
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const user = userArray.find(user => user.id === userId); //从数据库里找出用户id对应的那个用户
      const homeHtml = fs.readFileSync("./public/home.html").toString(); //替换完事
      let string = "";
      if (user) {
        string = homeHtml
          .replace("{{loginStatus}}", "已登录")
          .replace("{{user.name}}", user.name);
      }
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml
        .replace("{{loginStatus}}", "未登录")
        .replace("{{user.name}}", "");
      response.write(string);
    }
    response.end();
  } else {
    //否则还是静态页面
    response.statusCode = 200;
    // 默认首页
    const filePath = path === "/" ? "/index.html" : path;
    const index = filePath.lastIndexOf(".");
    // suffix 是后缀
    const suffix = filePath.substring(index);
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg"
    };
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || "text/html"};charset=utf-8`
    );
    let content;
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
