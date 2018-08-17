# gito	

gito，名字起源自git的日文发音(ギット)，是根据git原理、思路和用法，使用node.js开发的小型版本控制系统，目前实现了git的一小部分功能，包括add、commit、checkout等文件和分支基本操作。

<h3>实现</h3>

gito的操作空间和操作对象也与git一致，操作空间分为工作区（workspace）、暂存区（stage / index）和版本库（repository），版本库的目录结构也与git的`.git`目录结构保持一致，也包含index、HEAD、objects等目录和文件，同时操作对象也参照了git的实现分为blob、tree和commit，通过这三种对象的操作实现文件的版本控制。

<h3>目前已实现的功能(不定期更新)</h3>

1. `gito init`:初始化项目，与`git init`的实现一致；
2. `gito status`:查询repo的状态，与`git status`的实现一致；
3. `gito add`:将当前工作区文件添加到gito暂存区，目前不支持参数，与`git add <pathname>`类似；
4. `gito commit -m "commit description"`:将已经加入暂存区的文件提交到版本库，与`git commit -m "description"`功能一致，但目前只实现`-m`参数;
5. `gito checkout -f "filename"`:将未提交至版本库的文件还原为当前HEAD指向的版本，与`git checkout "filename"`实现一致；
6. `gito reset --hard`:还原到上次提交的状态，与`git reset --hard`实现一致，目前暂不支持还原到指定提交版本；
7. `gito branch <branchname>`:新建分支，与`git branch <branchname>`一致；
8. `gito branch -s <branchname>`:切换至指定分支，与`git checkout <branchname>`一致；
9. `gito branch -l`:查看当前所有分支及当前所在分支，与`git branch`一致；
10. `gito branch -d <branchname>`:删除指定分支，与`git branch -d <branchname>`一致；

<h3>Quick start</h3>

1、将项目clone至本地:
```
git clone https://github.com/Geocld/gito.git
```
2、在项目根目录创建一个名为`config.js`文件，添加以下内容，workspace是项目example文件夹在你本地的具体路径:
```
module.exports = {
    workspace: '<你的项目路径>/gito/example'
}
```
3、切换至example目录，开始试验gito:
```
cd ./example && ../bin/gito.js init
```

**注：目前只支持Linux\Unix操作系统的路径结构，Windows没做路径兼容，win下不保证能正常运行**

<h3>你可以从这里获收获什么</h3>

此项目是为了深入理解git的实现自己再次开发的项目，目前虽然只实现基本功能，但git常用操作的实现也能在这里找到js的实现方案，如果你对git的实现感兴趣但又因为git源码多而杂无法下手时，这个项目可以给你提供参考，如果你觉得这里的代码实现有待改善或添加新功能，欢迎fork并提交pr。

<h3>TODO</h3>
* 兼容Windows
* 支持还原指定版本
* 容错性修复
