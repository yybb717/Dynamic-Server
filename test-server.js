//fs用来读文件
const fs = require("fs");

//如何读数据库到服务器里
//读数据库里的users.json文件的内容并且变成字符串，命名为usersString
const usersString = fs.readFileSync("./db/users.json").toString();
//把符合JSON语法的字符串userString变成一个JS对象（数组）
const usersArray = JSON.parse(usersString);

//如何在服务器里写数据库
//在服务器里新建一个用户信息
const user3 = { id: 3, name: "tom", password: "yyy" };
//把新的用户信息推送到刚刚在服务器中生成的的usersArray数组里
usersArray.push(user3);
//把usersArray数组变回符合JSON语法的字符串
const string = JSON.stringify(usersArray);
//写回数据库的users.json文件中去
fs.writeFileSync("./db/users.json", string);
