(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.minesNF = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function Board(name,pars){
  this.tabId=name;
  this.sizeX=pars.c;
  this.sizeY=pars.r;
  this.bombs=pars.b;
}

Board.prototype.init=function (Xinit,Yinit,r){
  var maxDigit=0,curVal;
  this.board=[];
  this.mines={};
  this.checked={};
  this.empty=this.sizeX*this.sizeY-this.bombs;
  for (var i=0;i<this.sizeY+2;i++){
    this.board[i]=[];
    for (var j=0;j<this.sizeX+2;j++)
      this.board[i][j]=0;
  }
  var steps=this.bombs;
  while (steps>0){
    var x = Math.floor(Math.random()*this.sizeX)+1;
    var y = Math.floor(Math.random()*this.sizeY)+1;
    if (this.board[y][x]>8 || (Math.abs(x-Xinit)<r && Math.abs(y-Yinit)<r)) continue
    else {
      this.mines[this.tabId+'_'+x+'_'+y]=-8;
      for (var n1=-1;n1<2;n1++)
        for (var n2=-1;n2<2;n2++){
          curVal=++this.board[y+n1][x+n2];
          if (curVal<9 && curVal>maxDigit) maxDigit=curVal;
        }
      this.board[y][x]=9;
      steps--;
    }
  }
  this.maxDigit=maxDigit;
};

Board.prototype.checkCell=function(x,y,user){
  if (!this.checked[x+'_'+y]){
    var val=this.board[y][x]<9?this.board[y][x]:-8;
    var re={id:this.tabId,user:user,coords:[x,y],value:val,points:val,cells:{}};
    re.cells[this.tabId+'_'+x+'_'+y]=val;
    if (val>=0){
      this.empty--;
      this.checked[x+'_'+y]=1;
      if (val==0)
        this.addNeighbors(re,x,y);
    }
    re.flag='Cells'
    if (val==-8)
      re.flag='Bomb'
    if (this.empty==0)
      re.flag='Complete'
    return re;
  }
};

Board.prototype.addNeighbors=function(re,x,y){
  for (var ni=-1;ni<2;ni++)
    for (var nj=-1;nj<2;nj++){
      var xCur=x+nj;
      var yCur=y+ni;
      if (xCur>0 && xCur<this.sizeX+1 && yCur>0 && yCur<this.sizeY+1){
        if (this.checked[xCur+'_'+yCur]) continue
        else { 
          this.checked[xCur+'_'+yCur]=1;
          this.empty--;
          re.points+=this.board[yCur][xCur];
          re.cells[this.tabId+'_'+xCur+'_'+yCur]=this.board[yCur][xCur];
          if (this.board[yCur][xCur]==0)
            this.addNeighbors(re,xCur,yCur);
        }
      }
    }
};

module.exports=Board;

},{}],2:[function(require,module,exports){
var Game=require('./Game.js');

function CoopGame(pars){
  Game.call(this,pars);
  this.gamesPlayed=0;
  this.won=0;
  this.lost=0;
  this.winStreak=0;
  this.loseStreak=0;
};

CoopGame.prototype=new Game;

CoopGame.prototype.onStartBoard=function(){
  this.resetScore();
};

CoopGame.prototype.onResetBoard=function(e){
  this.gamesPlayed++;
  if (e.win){
    this.winStreak++;
    this.loseStreak=0;
    this.won++;
  } else{
    this.winStreak=0;
    this.loseStreak++;
    this.lost++;
  }
  var stat=this.getGenericStat();
  stat.result=e.win?'win':'fail',
  stat.lastClick=e.user,
  stat.score=this.score,
  stat.gamesPlayed=this.gamesPlayed,
  stat.won=this.won,
  stat.lost=this.lost,
  stat.winPercentage=Math.round(100*this.won/this.gamesPlayed)+'%',
  stat.streak=this.winStreak?this.winStreak:this.loseStreak;
  this.emitEvent('server',null,null,'coopGameResult',stat);
};

CoopGame.prototype.onCells=function(re){
  this.addPoints(re);
  this.openCells(re.cells);
};

CoopGame.prototype.onBomb=function(re){
  this.openCells(this.board.mines);
  this.resetBoard(re);
};

CoopGame.prototype.onComplete=function(re){
  this.addPoints(re);
  this.openCells(re.cells);
  this.openCells(this.board.mines);
  re.win=1;
  this.resetBoard(re);
};

module.exports=CoopGame;


},{"./Game.js":3}],3:[function(require,module,exports){
(function (process){
var Board=require('./Board');
var EventEmitter=require('events').EventEmitter;

function Game(pars){
  if (pars){
    this.profiles={};
    for (var u in pars.profiles)
      this.profiles[u]=pars.profiles[u];
    this.multiThread=pars.multiThread;
    this.id=pars.id;
    this.mode=pars.mode;
    this.bSize=pars.board.bSize;
    this.name=pars.name;
    this.players=pars.users;
    this.minPlayers=pars.minPlayers;
    this.spectators={};
    this.partyLeader=pars.leader;
    this.playersInGame=pars.curPlayers;
    this.penalty={};
    this.resetScore();
    this.board=new Board(pars.name,pars.board);
  }
}

Game.prototype=EventEmitter.prototype;

Game.prototype.emitEvent=function(dst,dstId,contextId,func,arg){
  this.emit('message',{dst:dst,
                dstId:dstId,
                contextId:contextId,
                func:func,
                arg:arg});

};

Game.prototype.dispatchEvent=function(e){
  
  var rpgCommands=[
    'cancelAction','hitTarget','castSpell','assistAttack','defendTarget','setParryState','setEvadeState',
    'stealLoot','equipGear','fleeBattle','ascendToFloor1','descendToNextFloor'];
  if (rpgCommands.indexOf(e.command)>-1 && this[e.command] && this.players[e.user]) this[e.command](e);

  if (e.command=='checkCell' && this.players[e.user])
    this.checkCell(e);
  if (e.command=='startBoard')
    this.startBoard();
  if (e.command=='initGUI')
    this.initGUI(e.user);
  if (e.command=='addSpectator')
    this.addSpec(e.user);
  if (e.command=='quitGame')
    this.quitGame(e.user);
};

Game.prototype.addSpec=function(user){
  this.spectators[user]=1;
  this.emitEvent('party',this.id,'system','Message',
                 user+' joined '+this.name+' as a spectator');
  this.initGUI(user);
  console.log(user+' joined '+this.name+' as a spectator');
};

Game.prototype.initGUI=function(user){
  this.emitEvent('client',user,'game','StartGame',
                 {mode:this.mode,boardId:this.name,r:this.board.sizeY,c:this.board.sizeX});
  this.emitEvent('client',user,'game','OpenLog',this.log);
};

Game.prototype.startBoard=function(){
  this.pause=0;
  this.logStart=0;
  this.log={};
  this.emitEvent('party',this.id,'game','StartGame',
                 {mode:this.mode,boardId:this.name,r:this.board.sizeY,c:this.board.sizeX});
  if (this.onStartBoard)
    this.onStartBoard();
};

Game.prototype.openFirstCell = function (x,y) {
  var openX=x||Math.round(this.board.sizeX/2);
  var openY=y||Math.round(this.board.sizeY/2);
  this.checkCell({pars:[openX,openY],user:'system'});
};

Game.prototype.resetBoard=function(e){
  this.pause=1;
  if (this.onResetBoard)
    this.onResetBoard(e);
  if (!e.noRestart){
    var self=this;
    setTimeout(function(){self.startBoard.call(self)},1000);
  }
};

Game.prototype.getGenericStat=function(){
return {mode:this.mode,
        name:this.name,
        partyId:this.id,
        bSize:this.bSize,
        partyLeader:this.partyLeader,
        users:this.players,
        start:this.logStart,
        time:this.now/1000,
        log:this.log,
        mines:this.board.mines};
};

Game.prototype.checkCell = function (e) {
  var x = parseInt(e.pars[0]) || 0;
  var y = parseInt(e.pars[1]) || 0;
  var cellFits=!(x < 1 || x > this.board.sizeX) && !(y < 1 || y > this.board.sizeY);
  var genericCheck=!this.pause && !this.penalty[e.user];
  var customCheck=this.canCheckCell?this.canCheckCell(genericCheck,e.user,x,y):genericCheck;
  if (cellFits && customCheck) {
    if (this.logStart==0) this.board.init(x, y, 2);
    var re = this.board.checkCell(x, y, e.user);
  }
  if (re) {
    this.logEvent(re);
    this['on' + re.flag].call(this, re);
  }
};

Game.prototype.resetScore=function(){
  this.score={};
  for (var p in this.players)
    this.score[p]=0;
};

Game.prototype.addPoints=function(re){
  this.score[re.user]+=re.points,
  this.log[this.now].points=re.points;
};

Game.prototype.openCells=function(cells){
  this.emitEvent('party',this.id,'game','CellValues',cells);
};

Game.prototype.setUserPenalty=function(user,time){
  this.penalty[user]=1;
  var self=this;
  setTimeout(function(){self.penalty[user]=0;},time);
};

Game.prototype.logEvent=function(re){
  var now=Date.now();
  if (this.logStart==0){
    this.logStart=now;
    this.now=0;
  }
  this.now=now-this.logStart;
  this.log[this.now]={user:re.user,
                      cellCoord:re.coords,
                      cellsOpened:re.cells,
                      val:re.value};
};

Game.prototype.quitGame=function(user){
  if (this.spectators[user]){
    delete this.spectators[user];
    this.emitEvent('server',null,null,'userExitGame',
                   {partyId:this.id,name:this.name,user:user});
  } else {
    this.playersInGame--;
    if (this.playersInGame<this.minPlayers){
      this.emitEvent('server',null,null,'gameExit',
                     {partyId:this.id,name:this.name,
                      spectators:this.spectators,users:this.players});
      if (this.multiThread)
        process.exit(0);
    } else {
      delete this.players[user];
      for (var i in this.players){
        this.partyLeader=i
        break;
      }
      this.emitEvent('server',null,null,'userExitGame',
                     {partyId:this.id,name:this.name,user:user});
    }
  }
};

Game.prototype.endGame=function(){
  for (var i in this.players)
    this.emitEvent('client',i,'game','EndGame');
  this.emitEvent('server',null,null,'childExit',
                 {partyId:this.id,name:this.name,
                  spectators:this.spectators,users:this.players});
  if (this.multiThread)
    process.exit(0);
};

module.exports=Game;

}).call(this,require('_process'))
},{"./Board":1,"_process":14,"events":13}],4:[function(require,module,exports){
var CoopGame=require('./Coop');
var VersusGame=require('./Versus');
var RankGame=require('./Rank');
var RPGCoopGame=require('./RPGCoop');
var RPGVersusGame=require('./RPGVersus');

module.exports.Board=require('./Board');

module.exports.RPGMechanics=require('./RPGMechanics');

module.exports.modes={
     rank:{constr:RankGame,s:{min:1,max:1},m:{min:1,max:1},b:{min:1,max:1}},
     soloRPG:{constr:RPGCoopGame,s:{min:1,max:1},m:{min:1,max:1},b:{min:1,max:1}},
     coop:{constr:CoopGame,s:{min:2,max:2},m:{min:2,max:3},b:{min:2,max:4}},
     coopRPG:{constr:RPGCoopGame,s:{min:1,max:2},m:{min:1,max:3},b:{min:1,max:4}},
     versus:{constr:VersusGame,s:{min:2,max:2},m:{min:2,max:3},b:{min:2,max:4}},
     versusRPG:{constr:RPGVersusGame,s:{min:2,max:2},m:{min:2,max:3},b:{min:2,max:4}}
  };

module.exports.boards={
    s:{bSize:'small',r:8,c:8,b:10},
    m:{bSize:'medium',r:16,c:16,b:40},
    b:{bSize:'big',c:30,r:16,b:99}
  };

module.exports.ranks={
    'small':[2,3,4,5,7,10,15,20],
    'medium':[15,20,25,30,40,50,60,100],
    'big':[60,70,85,100,120,150,200,300]
  };


},{"./Board":1,"./Coop":2,"./RPGCoop":6,"./RPGMechanics":8,"./RPGVersus":10,"./Rank":11,"./Versus":12}],5:[function(require,module,exports){
var Player=require("./RPGPlayer");
var RPGMechanics=require("./RPGMechanics");
	
function Boss(game,equip){
	Player.call(this, game, equip);
	this.mob=1;
}

Boss.prototype = new Player;

Boss.prototype.onChangeAP=function(profile){
	var isitme=(profile.name==this.profile.name);
	if (!isitme) return;
	this.doSomethingDelayed(null,null,"ApChange");
};

Boss.prototype.onAttackStarted=function(atkProfile){
	var isitme=(atkProfile.name==this.profile.name);
	if (isitme) return;
	var wasUnderAttack=this.underAttack;
	this.underAttack=atkProfile;
	this.doSomethingDelayed(this.game.actors[atkProfile.name],wasUnderAttack,"AtkStart");
};

Boss.prototype.onAttackEnded=function(atkProfile){
	var isitme=(atkProfile.name==this.profile.name);
	if (isitme) {
		this.doSomethingDelayed(null,null,"AtkEndMy");
		return;
	} else {
		if ( !this.underAttack || this.underAttack && this.underAttack.name==atkProfile.name ) {
			this.underAttack=null;
		}
		this.doSomethingDelayed(null,this.underAttack,"AtkEnd");
	}
};

Boss.prototype.doSomethingDelayed=function(tgt,underAttackProfile,srcEvt){
	var delay=0;
	delay=200*(1+Math.random()); // kind of avg human reaction time
	var self=this;
	if (delay) setTimeout(function(){ 
		//tgt means current event source player threatening us
		// underAttackProfile means possibly other player involved in recent attack on us
		if (!tgt && self.underAttack) tgt=self.game.actors[self.underAttack.name];
		if (!underAttackProfile) underAttackProfile=self.underAttack;
		if (underAttackProfile && !self.underAttack) underAttackProfile=null;
		self.doSomething.call(self, tgt, underAttackProfile, srcEvt); 
	}, delay);
	else this.doSomething(tgt,underAttackProfile,srcEvt);
};

Boss.prototype.doSomething=function(tgt,underAttackProfile,srcEvt){
	var me=this;
	if (!me.isMeAliveAndActive()) return;
	if (tgt && underAttackProfile && tgt.profile.name!=underAttackProfile.name) return; // new player started the attack on us
	if (underAttackProfile && !tgt) return; // was under attack when AP changed OR boss had not enough ap to parry/evade
	if (tgt && !underAttackProfile) underAttackProfile=tgt.profile;
	if (!tgt) tgt=this.getRandomTarget();
	if (!tgt) return; // zeds all dead
	if (["parry","evade"].indexOf(me.profile.state)>-1) return; // we are not allowed to change our mind
	
	var stillUnderAttack = underAttackProfile && underAttackProfile.state=='attack';
	var willBlock = stillUnderAttack && me.decideWillBlock(tgt.profile);
	var state = stillUnderAttack && me.decideParryEvade(tgt.profile);
	var willParryEvade = state && me.profile.curAP>=RPGMechanics.actionCostAP[state];
	var canAttack = me.isTargetAlive(tgt) && me.profile.curAP>=RPGMechanics.actionCostAP["hit"];
	
	if (willBlock){
		return;
	} else if (willParryEvade) {
		me.setState(me.profile,state);
	} else if (canAttack) me.startAttack(tgt);
};

Boss.prototype.getTargets=function(){
	var targets=[];
	for (var p in this.game.profiles) if (!this.game.profiles[p].mob && this.game.profiles[p].hp>0) targets.push(p);
	return targets;
};

Boss.prototype.getRandomTarget=function(){
	var targets=this.getTargets();
	var random=targets[Math.floor(Math.random()*targets.length)];
	return this.game.actors[random];
};

Boss.prototype.decideParryEvade=function(atkProfile){
	if (!atkProfile) return null;
	var me=this;
	var state=null;
	var chances=RPGMechanics.calcAtkChances(atkProfile,me.profile);
	var parryChance=chances.parry.chance;
	var evadeChance=chances.evade.chance;
	if (Math.random()<evadeChance) state="evade";
	if (parryChance>evadeChance){
		if (Math.random()<parryChance) state="parry";
		else state=null;
	} 	
	return state;
};

Boss.prototype.decideWillBlock=function(atkProfile){
	if (!atkProfile) return false;
	var me=this;
	var willBlock = me.profile.pdef>atkProfile.patk;
	return willBlock;
};

Boss.prototype.decideCancelAttack=function(atkProfile){
	if (!atkProfile) return false;
	return this.decideWillBlock(atkProfile) || this.decideParryEvade(atkProfile);
};

Boss.prototype.randomDecision=function(ratio){
	return Math.random()<RPGMechanics.constants.BASIC_CHANCE*ratio;
}

Boss.prototype.isUnderAttack=function(){
	return this.underAttack;
};

Boss.prototype.isMeAliveAndActive=function(){
	return this.profile.hp>0 && this.profile.state!="cooldown" && this.profile.state!="attack";
};

Boss.prototype.isTargetAlive=function(tgt){
	return tgt.profile.hp>0;
};

Boss.prototype.onState=function(profile,state,arg){
	var isitme=(profile.name==this.profile.name);
	if (this['onState_'+state]) this['onState_'+state](isitme,profile,state,arg);
};
/*
Boss.prototype.onState_active=function(isitme,profile){
	if (!isitme) return;
	var me=this;
	var atkProfile=me.isUnderAttack();
	var state=this.decideParryEvade(atkProfile);
	var willParryEvade=state && me.randomDecision(3/2);
	var willBlock = me.decideWillBlock(atkProfile) && me.randomDecision(1);
	// console.log("boss active");
	if (atkProfile){
		// console.log("boss under attack",atkProfile.name);
		if (willBlock) {
			// console.log("boss will block");
			return;
		} else if (willParryEvade) {
			// console.log("boss will set state",state);
			this.setState(me.profile,state);
			return;
		}
	}
	var tgt=this.getRandomTarget();
	if (tgt) me.waitAndAttack(tgt);
};

Boss.prototype.onState_cooldown=function(isitme,profile,arg){
	if (isitme ) return;
	// console.log("found profile in cooldown",profile.name);
	var me=this, tgt=this.game.actors[profile.name];
	if ( me.isMeAliveAndActive() && !me.decideWillBlock(me.isUnderAttack()) ) me.waitAndAttack(tgt);
};

Boss.prototype.onState_assist=function(isitme,profile,arg){
	console.log(profile.name,arg);
};

Boss.prototype.waitAndAttack=function(tgt){
	var me=this;
	// console.log("boss will wait and attack");
	setTimeout( function(){
		if( me.isMeAliveAndActive() && !me.decideCancelAttack(me.isUnderAttack()) && me.isTargetAlive(tgt) ) {
			// console.log("boss attacks");
			me.startAttack.call(me,tgt);
		}
	},RPGMechanics.constants.BOSS_ATTACK_DELAY_TIME);
};

Boss.prototype.onStartAttack=function(atkProfile){

	var me=this, tgt=this.game.actors[atkProfile.name];	
	// console.log(atkProfile.name,"started attack",me.profile.name,me.profile.state);
	var wasUnderAttack=me.isUnderAttack();
	if (wasUnderAttack) console.log("boss was already under attack",wasUnderAttack.name);
	me.underAttack=atkProfile;
	
	if (me.profile.state=="cooldown") return;

	var state=this.decideParryEvade(atkProfile);
	var willParryEvade=state && me.randomDecision(1);
	var willCancelAttack=me.decideCancelAttack(atkProfile) && me.randomDecision(1/3);
	var willBlock = me.decideWillBlock(atkProfile) && me.randomDecision(3/2);

	if (me.profile.state=="attack"){
		if (willCancelAttack) {
			// console.log("boss decided to cancel attack");
			me.cancelAction(); // onState_active handler will do proper stuff when called later
		}
	} else if (willBlock){
		return;
	} else if(willParryEvade) {
		this.setState(me.profile,state);
	} else me.waitAndAttack(tgt);
	
};
*/
module.exports=Boss;
},{"./RPGMechanics":8,"./RPGPlayer":9}],6:[function(require,module,exports){
var RPGGame=require('./RPGGame');
var Boss=require('./RPGBoss');
var RPGMechanics=require("./RPGMechanics");

function RPGCoopGame(pars) {
	RPGGame.call(this, pars);
	this.boardPars=pars.board;
	this.boardDensityDelta={"small":1,"medium":2,"big":4}[pars.board.bSize];
	this.floor=1;
	this.recipes=[];
	this.loot={};
}

RPGCoopGame.prototype = new RPGGame;

RPGCoopGame.prototype.onStartBoard = function () {
	this.voteFlee={};
	this.voteAscend={};
	this.voteDescend={};
	if (!this.fledPreviousBattle) this.restoreLives();
	this.lostCoords={};
	this.digitPocket={};
	this.bossLevel=1;
};

RPGCoopGame.prototype.stealLoot = function (e) {
	
	var userProfile=this.profiles[e.user],bossProfile=this.profiles.boss;
	
	if (!this.inBattle || bossProfile.wasHit || bossProfile.spottedStealing) return;

	if (userProfile.livesLost==8 || userProfile.hp==0) {
		this.emitEvent('client', e.user, 'system', 'Message','You are dead now, and cannot do that');
		return;
	}
	
	if (!bossProfile.stealAttempts) bossProfile.stealAttempts=0;
	bossProfile.stealAttempts++;
	
	var fasterRatio=1;
	if (userProfile.speed>bossProfile.speed) fasterRatio=Math.sqrt((userProfile.speed+1)/(bossProfile.speed+1));
	
	var spotChance=0.2*bossProfile.stealAttempts/fasterRatio;
	if (RPGMechanics.rollDice("stealSpotted",spotChance)){
		bossProfile.spottedStealing=true;
		bossProfile.patk=Math.ceil(1.3*(bossProfile.patk+1));
		bossProfile.speed=Math.ceil(1.3*(bossProfile.speed+1));
		this.actors.boss.refreshApStats.call(this.actors.boss,bossProfile);
		this.emitEvent('party', this.id, 'system', 'Message', 'Stealing failed. Spotted');
		this.emitEvent('party', this.id, 'game', 'StealFailed', 
			{ user:e.user, spotted:true, profiles:this.profiles, chance:spotChance }
		);
		return;
	}
	
	var stealChance=fasterRatio/bossProfile.level*Math.sqrt(bossProfile.stealAttempts)/8;
	stealChance*=RPGMechanics.adjustLivesLost(userProfile);
	if (RPGMechanics.rollDice("stealSucceed",stealChance)){
		this.inBattle=false;
		this.stopBoss();
		this.emitEvent('party', this.id, 'game', 'StealSucceeded',  { user:e.user,chance:stealChance } );
		this.completeFloor({eventKey:'endBattleStole'});
	} else {
		this.emitEvent('party', this.id, 'system', 'Message', 'Stealing failed');
		this.emitEvent('party', this.id, 'game', 'StealFailed', { user:e.user,spotted:false,chance:stealChance } );
	}
};

RPGCoopGame.prototype.resetFloor = function () {
	this.fledPreviousBattle=false;
	this.recipes=[];
	this.loot={};
	this.orbs={};
	this.floor=1;
	this.board.bombs=this.boardPars.b;
};

RPGCoopGame.prototype.fleeBattle = function (e) {
	if (!this.inBattle || this.profiles.boss.spottedStealing) return;
	this.voteFlee[e.user]=true;
	this.sendUserVote(e.user,"battleFlee");
	var voteFleeAccepted=true;
	for (var p in this.players) if(!this.voteFlee[p]) voteFleeAccepted=false;
	if (voteFleeAccepted) {
		this.fledPreviousBattle=true;
		this.stopBoss();
		this.resetBoard({eventKey:'endBattleFlee',result:"flee",floor:this.floor,lives:this.livesTotal});
	}
};

RPGCoopGame.prototype.stopBoss = function () {
	// if (this.actors.boss.timer) clearTimeout(this.actors.boss.timer);
	clearTimeout(this.actors.boss.apTimer);
	this.actors.boss.apTimer=null;
};

RPGCoopGame.prototype.ascendToFloor1 = function (e) {
	if (!this.floorCompleted) return;
	this.voteAscend[e.user]=true;
	this.sendUserVote(e.user,"battleAscend");
	var voteAscendAccepted=true;
	for (var p in this.players) if(!this.voteAscend[p]) voteAscendAccepted=false;
	if (voteAscendAccepted) {
		this.resetBoard({eventKey:'completeFloorAscend',result:"win",floor:this.floor,loot:this.loot,recipes:this.recipes});
		this.resetFloor();
	}
};

RPGCoopGame.prototype.descendToNextFloor = function (e) {
	if (!this.floorCompleted) return;
	// this.voteDescend[e.user]=true;
	this.sendUserVote(e.user,"battleDescend");
	var voteDescendAccepted=true;
	// for (var p in this.players) if(!this.voteDescend[p]) voteDescendAccepted=false;
	if (voteDescendAccepted) {
		this.floor++;
		this.board.bombs+=this.boardDensityDelta;
		this.resetBoard({result:"continue",floor:this.floor,eventKey:'completeFloorDescend',user:e.user});
	}
};

RPGCoopGame.prototype.completeFloor = function (e) {
	this.floorCompleted=true;
	for (var d in this.digitPocket){
		if (!this.loot[d]) this.loot[d]=0;
		this.loot[d]+=this.digitPocket[d];
	}
	e.loot=this.loot;
	e.floor=this.floor;
	var floorFilter=Math.ceil(this.floor/5);
	var effects=RPGMechanics.gems.filter(function(g){ return g.rarity>0 && g.rarity<=floorFilter }).map(function(g){ return g.eft; });
	if (this.knowledgePresence && e.eventKey!='endBattleStole'){
		var effect=effects[Math.floor(Math.random()*effects.length)];
		this.recipes.push(effect);
		e.effect=effect;
	}
	this.emitEvent('party', this.id, 'game', 'CompleteFloor', e);
};

RPGCoopGame.prototype.onResetBoard = function (e) {
	this.inBattle=false;
	this.floorCompleted=false;
	this.knowledgePresence=false;
	this.emitEvent('party', this.id, 'system', 'Message', 'Floor result: '+e.eventKey);
	this.emitEvent('party', this.id, 'game', 'ShowResultRPGCoop', e);
};

RPGCoopGame.prototype.onCells = function (re) {
	this.addCells(re.cells);
	this.addOrbs(re.user,this.calcOrbs(re.cells));
	this.openCells(re.cells);
};

RPGCoopGame.prototype.canCheckCell=function(genericCheckResult,user){
	return genericCheckResult && this.profiles[user].livesLost<8;
};

RPGCoopGame.prototype.onBomb = function (re) {
	var coord=re.coords[0]+"_"+re.coords[1];
	if (!this.lostCoords[coord]){
		this.lostCoords[coord]=0;
		this.livesLost++;
		this.profiles[re.user].livesLost++;
		this.livesTotal--;
		this.emitEvent('party', this.id, 'game', 'UserLostLife', {user:re.user,livesLost:this.profiles[re.user].livesLost});
	}
	if (this.profiles[re.user].livesLost==8) {
		this.emitEvent('client', re.user, 'system', 'Message', 'You have lost all your lives');
		this.emitEvent('party', this.id, 'system', 'Message', re.user+' died');
		this.emitEvent('party', this.id, 'game', 'UserDied', {user:re.user});
	}
	if (this.livesTotal==0){
		this.openCells(this.board.mines);
		re.eventKey="endBattleLostAllLives";
		re.floor=this.floor;
		re.time=this.getGenericStat().time;
		this.resetBoard(re);
		this.resetFloor();
	} else {
		this.lostCoords[coord]++;
		this.openCells(re.cells);
	}
};

RPGCoopGame.prototype.startBattle = function () {
	var rpg=RPGMechanics;
	
	this.inBattle=true;
	
	var stat=this.getGenericStat();

	this.totalHp=0;

	for (var u in this.players){
		var userProfile=this.actors[u].adjustProfile({ "level":8, "name":u, "livesLost":this.profiles[u].livesLost });
		if (this.fledPreviousBattle) userProfile.pdef=this.profiles[u].pdef;
		if (userProfile.livesLost<8) userProfile.hp=userProfile.level-userProfile.livesLost+userProfile.maxhp;
		else userProfile.hp=0;
		this.totalHp+=userProfile.hp;
		this.profiles[u]=userProfile;
	}
	
	for (var p in this.profiles) if (!this.players[p]) delete this.profiles[p];
	
	this.actors.boss=new Boss(this, RPGMechanics.genBossEquip(this.floor,this.bossLevel,this.bSize,stat) );
	var bossProfile=this.actors.boss.adjustProfile({ "level":this.bossLevel, "mob":1 });
	
	var recipeChance=0.1;
	var wiseBosses={ 
		small:{ 5:1.5, 6:2, 7:2, 8:3 },
		medium:{ 6:1.5, 7:2, 8:3 },
		big:{ 6:1.25, 7:2, 8:3 }
	};
	if (wiseBosses[this.bSize][this.bossLevel]) recipeChance*=wiseBosses[this.bSize][this.bossLevel];
	var wiseFloors={small:3,medium:2,big:1};
	if (this.fledPreviousBattle || this.floor<wiseFloors[this.bSize]) recipeChance=0;
	this.fledPreviousBattle=false;
	this.knowledgePresence=RPGMechanics.rollDice("recipeFind",recipeChance);

	var names=['angry','hungry','greedy','grumpy'];
	bossProfile.name=(this.knowledgePresence?'wise':names[Math.floor(names.length*Math.random())])+' Phoenix';
	bossProfile.hp=bossProfile.level+bossProfile.maxhp;
	this.profiles.boss=bossProfile;
	bossProfile.bossRatio=RPGMechanics.calcFloorCompleteRatio(this.bossLevel,this.bSize,stat);
	
	this.emitEvent('party', this.id, 'system', 'Message', 'Start Battle vs '+ bossProfile.name);
	this.emitEvent('party', this.id, 'game', 'StartBattleCoop', {
		key:'startBattle',profiles:this.profiles,knowledgePresence:this.knowledgePresence,
		time:stat.time, floor:this.floor, livesLost:this.livesLost, bossName:bossProfile.name
	});
};

RPGCoopGame.prototype.checkBattleComplete = function (re,atkProfile,defProfile) {
	if ( re.dmg && !defProfile.mob) this.totalHp--;
	if (defProfile.mob && defProfile.hp==0) {
		this.inBattle=false;
		this.stopBoss();
		this.completeFloor({eventKey:'endBattleWin'});
	} else if (!defProfile.mob && this.totalHp==0){
		this.inBattle=false;
		this.stopBoss();
		if (this.pauseOnBattleLost) {
			this.pauseOnBattleLost();
		} else {
			this.resetBoard({eventKey:'endBattleLose', floor:this.floor});
			this.resetFloor();
		}
	}
};

RPGCoopGame.prototype.onComplete = function (re) {
	this.addCells(re.cells);
	this.addOrbs(re.user,this.calcOrbs(re.cells));
	this.openCells(re.cells);
	this.openCells(this.board.mines);
	if (!this.inBattle) this.startBattle();
};

module.exports=RPGCoopGame;

},{"./RPGBoss":5,"./RPGGame":7,"./RPGMechanics":8}],7:[function(require,module,exports){
var Game=require('./Game');
var Player=require('./RPGPlayer');
var RPGMechanics=require("./RPGMechanics");
	
function RPGGame(pars) {
	Game.call(this, pars);
	this.actors={};
	for (var u in this.players) {
		if(!this.profiles[u]) this.profiles[u]={};
		this.actors[u]=new Player(this,this.profiles[u].equip||[]);
	}
	this.orbs={};
}

RPGGame.prototype = new Game;

Game.prototype.initGUI=function(user){
	this.emitEvent('client',user,'game','StartGame', {mode:this.mode,boardId:this.name,r:this.board.sizeY,c:this.board.sizeX});
	if (this.inBattle) {
		this.emitEvent('client', user, 'game', 'StartBattle', { key:'startBattle',profiles:this.profiles });
	} else {
		this.emitEvent('client',user,'game','OpenLog',this.log);
  	}
};

RPGGame.prototype.restoreLives = function () {
	this.livesLost=0;
	this.livesTotal=0;
	for (var u in this.players) {
		this.profiles[u].livesLost=0;
		this.livesTotal+=8;
	}
};

RPGGame.prototype.equipGear = function (e) {
	if (e.pars.length==0 || e.pars.length>8 ) return;
	var user=this.actors[e.user];
	
	if ( user.equip.length>0 || this.inBattle ) return;
		
	user.equip=e.pars;
	this.emitEvent('client', e.user, 'system', 'Message','Equipped '+user.equip);
};

RPGGame.prototype.assertNotBusyState=function(user){
	if (["attack","cast","cooldown"].indexOf(user.profile.state)>-1) throw "busy";
};

RPGGame.prototype.assertActiveState=function(user){
	if (user.profile.state!="active") throw "not active";
};

RPGGame.prototype.assertNotCoolDown=function(user){
	if (user.profile.state=="cooldown") throw "cooldown";
};

RPGGame.prototype.assertNotSelf=function(user,tgt){
	if (user.profile.name==tgt.profile.name) throw "self";
};

RPGGame.prototype.assertSpellExist=function(spell){
	if (!RPGMechanics.spells[spell]) throw "spell not exist";
};

RPGGame.prototype.assertAliveTarget=function(tgt){
	if (!tgt || !tgt.profile) throw "incorrect tgt";
	if (tgt.profile.hp==0) throw "target dead";
};

RPGGame.prototype.assertAliveAndInBattle=function(user){
	if (!this.inBattle) throw "not in battle";
	if (user.profile.livesLost==8 || user.profile.hp==0) {
		this.emitEvent('client', user, 'system', 'Message','You are dead now, and cannot do that');
		throw "dead";
	}	
};

RPGGame.prototype.assertEnoughAP=function(user,action){
	if (user.profile.curAP < RPGMechanics.actionCostAP[action]) throw "not enough AP";
};

RPGGame.prototype.cancelAction = function (e) {
	var user=this.actors[e.user];
	try {
		this.assertAliveAndInBattle(user);
		this.assertNotCoolDown(user);
		user.cancelAction();
	} catch (e) {}
};

RPGGame.prototype.trySetPlayerState = function (userName,state) {
	var user=this.actors[userName];
	try {
		this.assertAliveAndInBattle(user);
		this.assertNotCoolDown(user);
		user.setState(user.profile,state);
	} catch (e) {}
};

RPGGame.prototype.setParryState = function (e) {
	this.trySetPlayerState(e.user,"parry");
};

RPGGame.prototype.setEvadeState = function (e) {
	this.trySetPlayerState(e.user,"evade");
};	

RPGGame.prototype.assistAttack = function (e) {
	var user=this.actors[e.user], tgt=this.actors[e.pars[0]||"boss"];
	try {
		this.assertAliveAndInBattle(user);
		this.assertNotBusyState(user);
		this.assertNotSelf(user,tgt);
		this.assertEnoughAP(user,"assist");
		if (tgt.profile.state=="attack" && tgt.profile.target!=user.profile.name) user.addAssist(tgt);
	} catch (e) {}
};

RPGGame.prototype.defendTarget = function (e) {
	var user=this.actors[e.user], tgt=this.actors[e.pars[0]||"boss"];
	try {
		this.assertAliveAndInBattle(user);
		this.assertNotBusyState(user);
		this.assertNotSelf(user,tgt);
		this.assertEnoughAP(user,"defend");
		if (!tgt.profile.mob && tgt.profile.attackers>0) user.defendTarget(tgt);
	} catch (e) {}
};

RPGGame.prototype.hitTarget = function (e) {
	var user=this.actors[e.user],tgt=this.actors[e.pars[0]||"boss"];
	try {
		this.assertAliveTarget(tgt);
		this.assertAliveAndInBattle(user);
		this.assertNotBusyState(user);
		this.assertNotSelf(user,tgt);
		this.assertEnoughAP(user,"hit");
		user.startAttack(tgt);
	} catch (e) {}
};

RPGGame.prototype.castSpell = function (e) {
	var user=this.actors[e.user],tgt=this.actors[e.pars[1]||e.user];
	var spell=e.pars[0];
	try {
		this.assertAliveTarget(tgt);
		this.assertSpellExist(spell);
		this.assertAliveAndInBattle(user);
		this.assertNotBusyState(user);
		if( user.profile.mana>0 ) user.startCastSpell(spell,tgt);
		// if( user.profile.spells[spell].mp>0 ) user.startCastSpell(spell,tgt);
	} catch (e) {}
};

RPGGame.prototype.sendUserVote = function (user, eventKey) {
	this.emitEvent('party', this.id, 'system', 'Message', user+'voted for '+eventKey);
	this.emitEvent('party', this.id, 'game', 'GameUserVote', {user:user,eventKey:eventKey});
};

RPGGame.prototype.addCells = function (cells) {
	var i,n;
	for (i in cells) {
		n=cells[i];
		if(n>0) {
			if (!this.digitPocket[n]) this.digitPocket[n]=0;
			this.digitPocket[n]++;
			if (n>this.bossLevel) this.bossLevel=n;
		}
	}
};

RPGGame.prototype.calcOrbs = function (cells) {
	var i,n=0;
	for (i in cells) n+=cells[i];
	if (n<10) return [];
	var orbs=Math.floor(n/20), almostOrb=n%20;
	if (Math.random()<almostOrb/20) orbs++;
	return this.getRandomOrbs(orbs);
};

RPGGame.prototype.getRandomOrbs = function (n) {
	var keys=Object.keys(RPGMechanics.orbEffects);
	var effects=[];
	while (n>0){
		effects.push(keys[Math.floor(keys.length*Math.random())]);
		n--;
	}
	return effects;
};

RPGGame.prototype.addOrbs = function (user,orbs) {
	if (user=='system' || orbs.length==0) return;
	if (!this.orbs[user]) this.orbs[user]={};
	var myOrbs=this.orbs[user];
	orbs.forEach(function(effect){
		if (!myOrbs[effect]) myOrbs[effect]=0;
		myOrbs[effect]++;
	});
	this.emitEvent('party', this.id, 'game', 'AddOrbs', { user:user, added:orbs, orbs:myOrbs });
};

RPGGame.prototype.canCheckCell=function(genericCheckResult,user){
	return genericCheckResult;
};

RPGGame.prototype.onResultHitTarget = function (re,atkProfile,defProfile) {
	re.profiles=this.profiles;
	re.attack=atkProfile.name;
	re.defense=defProfile.name;
	this.emitEvent('party', this.id, 'game', 'ResultHitTarget', re);
	if (this.checkBattleComplete) this.checkBattleComplete(re,atkProfile,defProfile);
};

RPGGame.prototype.onResultSpellCast = function (re,srcProfile,tgtProfile){
	re.profiles=this.profiles;
	re.source=srcProfile.name;
	re.target=tgtProfile.name;
	this.emitEvent('party', this.id, 'game', 'ResultCastSpell', re);
	if (this.checkBattleComplete) this.checkBattleComplete(re,srcProfile,tgtProfile);
};

module.exports=RPGGame;

},{"./Game":3,"./RPGMechanics":8,"./RPGPlayer":9}],8:[function(require,module,exports){
var RPGMechanics={
	
	constants:{
		ARMOR_ENDURANCE:1,
		BASIC_CHANCE:0.5,
		ORB_CHANCE_ADJUST:0.05,
		INTERRUPT_CHANCE:0.4,
		BOSS_ATTACK_DELAY_TIME:1000,
		ATTACK_TIME:1500,
		CAST_TIME:2000,
		NO_COOLDOWN_TIME:0,
		COOLDOWN_HIT:1000,
		COOLDOWN_MISS:1500,
		AP_TICK:2000,
		AP_HIT_COST:1,
		AP_MISS_COST:1,
		AP_ATTACK_COST:2,
		AP_PARRY_EVADE_COST:1
	},
	
	orbEffects:{
		parry:-1,
		antiparry:0,
		evade:-1,
		antievade:0,
		crit:1,
		anticrit:0,
		pierce:1,
		antipierce:0,
		degrade:1,
		antidegrade:0,
		interrupt:1,
		antiinterrupt:0
	},
	
	actionCostAP:{
		hit:2,
		assist:2,
		defend:2,
		parry:1,
		evade:1
	},

	gems:[
		{eft:"mana",rarity:0},
		{eft:"maxhp",rarity:1},
		{eft:"patk",rarity:1},
		{eft:"pdef",rarity:1},
		{eft:"speed",rarity:1},
		// {eft:"patkinc",rarity:2},
		// {eft:"pdefinc",rarity:2},
		// {eft:"speedinc",rarity:2},
		// {eft:"patkdec",rarity:3},
		// {eft:"pdefdec",rarity:3},
		// {eft:"speeddec",rarity:3},
		// {eft:"heal",rarity:4},
		// {eft:"lifesteal",rarity:4},
	],

	spells:{
		patkinc:function(srcProfile,tgtProfile){ tgtProfile.patk++; },
		pdefinc:function(srcProfile,tgtProfile){ tgtProfile.pdef++; },
		speedinc:function(srcProfile,tgtProfile){ tgtProfile.speed++; },
		patkdec:function(srcProfile,tgtProfile){ if (tgtProfile.patk>0) tgtProfile.patk--; },
		pdefdec:function(srcProfile,tgtProfile){ if (tgtProfile.pdef>0) tgtProfile.pdef--; },
		speeddec:function(srcProfile,tgtProfile){ if (tgtProfile.speed>0) tgtProfile.speed--; },
		// heal:function(srcProfile,tgtProfile){ tgtProfile.hp++; },
		// lifesteal:function(srcProfile,tgtProfile){ srcProfile.hp++; tgtProfile.hp--; }
	},
	
	rollDice:function (effect,chance,log) {
		var rnd=Math.random();
		if(log) console.log(effect,chance,rnd); //some logging or processing later maybe
		return chance>rnd;
	},
	
	adjustLivesLost:function(profile){
		if (profile.bossRatio) return 1;
		return Math.sqrt((8-profile.livesLost)/9);
	},
	
	adjustBossRatio:function(profile){
		if (profile.bossRatio) return profile.bossRatio;
		return 1;
	},
	
	calcFloorCompleteRatio:function(bossLevel,bSize,stat){
		var ratio=1;
		var times={"small":10.0,"medium":40.0,"big":120.0};
		var bossLevelRatio={ 1:0.7, 2:0.8, 3:0.9, 4:1.1, 5:1.2, 6:1.3, 7:1.4, 8:1.5};
		ratio*=bossLevelRatio[bossLevel];
		var timeRatio=(times[bSize]-stat.time)/times[bSize];
		if (timeRatio<0) timeRatio=1;
		ratio*=Math.sqrt(timeRatio);
		return ratio;
	},

	genBossEquip:function(floor,bossLevel,bSize,stat){
		var equip=[];
		// var effects=["maxhp","patk","pdef","speed"];
		var effects=this.gems.filter(function(g){ return g.rarity==1}).map(function(g){ return g.eft; });
		var gemCount=floor;
		while (gemCount>0) {
			equip.push( "common_"+effects[Math.floor(Math.random()*4)] );
			gemCount--;
		}
		return equip;
	},
	
	adjustChanceWithOrbs:function(eft,chance,atkProfile,defProfile){
		var rpg=RPGMechanics;
		var atkdef= rpg.constants.ORB_CHANCE_ADJUST * rpg.orbEffects[eft];
		var delta=atkdef*(atkProfile.orbs[(atkdef>0?'':'anti')+eft]||0) - atkdef*(defProfile.orbs[(atkdef<0?'':'anti')+eft]||0);
		// console.log(eft,chance,delta);
		return chance+delta;
	},
	
	calcAtkChances:function (atkProfile,defProfile) {

		var rpg=RPGMechanics;
		
		function evade(){
			var evadeChance=rpg.adjustChanceWithOrbs("evade",rpg.constants.BASIC_CHANCE,atkProfile,defProfile);
			evadeChance+=0.05*(defProfile.speed-atkProfile.speed);
			evadeChance*=rpg.adjustLivesLost(defProfile);
			evadeChance*=rpg.adjustBossRatio(defProfile);
			var re={ eventKey:'hitEvaded', chance:evadeChance, result:false};
			if (rpg.rollDice("fightEvade",evadeChance)) re.result=true;
			return re;
		}
		function parry(){
			var parryChance=rpg.adjustChanceWithOrbs("parry",rpg.constants.BASIC_CHANCE,atkProfile,defProfile);
			parryChance+=0.05*(defProfile.patk-atkProfile.patk);
			parryChance*=rpg.adjustLivesLost(defProfile);
			parryChance*=rpg.adjustBossRatio(defProfile);
			var re={ eventKey:'hitParried', chance:parryChance, result:false};
			if (rpg.rollDice("fightParry",parryChance)) re.result=true;
			return re;
		}
		function crit(){
			var critChance=rpg.adjustChanceWithOrbs("crit",rpg.constants.BASIC_CHANCE/5,atkProfile,defProfile);
			critChance+=0.1*(atkProfile.speed-defProfile.speed);
			critChance*=rpg.adjustLivesLost(atkProfile);
			critChance*=rpg.adjustBossRatio(atkProfile);
			var re={ eventKey:'hitDamageCrit', chance:critChance, result:false};
			if (rpg.rollDice("fightCrit",critChance)) re.result=true;
			return re;		
		}
		return { evade:evade(), parry:parry(), crit:crit() };
	}
};

module.exports=RPGMechanics;
},{}],9:[function(require,module,exports){
var RPGMechanics=require("./RPGMechanics");
	
function Player(game,equip){
	this.game=game;
	this.equip=equip;
}

Player.prototype={
	
	adjustProfile:function(template){
		var power={"common":1,"rare":2,"epic":3};
		template=RPGMechanics.gems.reduce(function(prev,cur){ prev[cur.eft]=0; return prev; },template);
		template.armorEndurance=RPGMechanics.constants.ARMOR_ENDURANCE;
		template.state="active";
		template.attackers=0;
		template.spells={};
		template.orbs=this.game.orbs[template.name]||{};
		template.equip=this.equip;
		
		this.profile=this.equip.reduce(function(prev,cur){
			var gem=cur.split("_"),e=gem[1],p=gem[0];
			if ( prev[e]>=0 && power[p] ) {
				prev[e]+=power[p];
				// if(RPGMechanics.spells[e]) {
				// 	prev.spells[e]={mp:prev[e],spell:e};
				// 	prev.haveSpells=true;
				// }
			}
			return prev;
		},template);
		
		var profile=this.profile, game=this.game, self=this; 
		this.refreshApStats(profile);
		function apTickFn(){
			if (self.apTimer) self.apTimer=setTimeout(apTickFn,self.apTick);
			else return;
			if (profile.curAP==profile.maxAP) return;
			profile.curAP++;
			game.emitEvent('party', game.id, 'game', 'ChangePlayerAP', { 
				profiles:game.profiles, user:profile.name, curAP:profile.curAP 
			});
			if(game.actors.boss) game.actors.boss.onChangeAP(profile);
		}
		if (this.apTimer) clearTimeout(this.apTimer);
		this.apTimer=setTimeout(apTickFn,this.apTick);
		
		return this.profile;
	},

	refreshApStats:function(profile){
		this.apTick=RPGMechanics.constants.AP_TICK-250*(profile.speed<12 ? Math.floor(profile.speed/3) : 4);
		this.profile.maxAP= 3 + (profile.patk<12 ? Math.floor(profile.patk/4) : 3);
		this.profile.curAP=profile.curAP||0;
	},
		
	setState:function(profile,state,arg){
		if (profile.state==state) return;

		var oldState=profile.state;
		var oldTarget=this.game.profiles[profile.target]||this.game.profiles.boss;
		if (oldState=='attack') {
			oldTarget.attackers--;
		}
		if (oldState=='assist' ) {
			if (oldTarget.assists && oldTarget.assists[profile.name]) delete oldTarget.assists[profile.name];
		}
		if (oldState=='defend') {
			oldTarget.defender=null;
		}
		if (['assist','defend','attack'].indexOf(state)>-1) profile.target=arg;
		else profile.target=null;

		if (state=='active') timer=null;
		profile.state=state;

		var game=this.game;
		if(game.actors.boss) game.actors.boss.onState(profile,state,arg);
		game.emitEvent('party', game.id, 'game', 'ChangeState', { profiles:game.profiles, user:profile.name, state:state, val:arg });
	},
	
	applyPenalty:function(players){
		var self=this;
		var game=this.game;
		var interruptableStates=["cast"];
		players.forEach(function(p){
			var profile=game.profiles[p.name];
			if (p.time>0) {
				profile.curAP-=p.time;
				game.emitEvent('party', game.id, 'game', 'ChangePlayerAP', { profiles:game.profiles, user:profile.name, curAP:profile.curAP });
			}
			if (!p.attacker && game.actors[p.name].timer){
				var interruptChance=RPGMechanics.adjustChanceWithOrbs("interrupt",RPGMechanics.constants.INTERRUPT_CHANCE,self.profile,profile);
				if ( interruptableStates.indexOf(profile.state)>-1 && RPGMechanics.rollDice("fightInterrupt",interruptChance)){
					clearTimeout(game.actors[p.name].timer);
					game.emitEvent( 'party', game.id, 'game', 'BattleLogEntry', { eventKey:'actionInterrupted', defense:profile.name } );
				} else return;
			}
			self.setState.call(self,profile,"active");
			game.actors[p.name].timer=null;
		});
	},

	cancelAction:function(){
		var me=this.profile;
		this.setState(me,"active");
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer=null;
		}
	},

	addAssist:function(tgt){
		var me=this.profile;
		if (!tgt.profile.assists) tgt.profile.assists={};
		tgt.profile.assists[me.name]=me;
		this.setState(this.profile,"assist",tgt.profile.name);
	},

	defendTarget:function(tgt){
		var game=this.game;
		var me=this.profile;
		tgt.profile.defender=me.name;
		me.curAP-=RPGMechanics.actionCostAP.defend;
		game.emitEvent('party', game.id, 'game', 'ChangePlayerAP', { profiles:game.profiles, user:me.name, curAP:me.curAP });
		this.setState(this.profile,"defend",tgt.profile.name);
	},

	startAttack:function(tgt){
		var me=this.profile;
		tgt.profile.attackers++;
		this.setState(me,"attack",tgt.profile.name);
		if (tgt.onAttackStarted) tgt.onAttackStarted.call(tgt,me);
		var atkTimeAdjustment={ 0:0, 1:250, 2:250, 3:500, 4:500, 5:750, 6:1000 };
		var adjustRaio=(me.speed<12 ? Math.floor(me.speed/2) : 6);
		var adjustedAttackTime=RPGMechanics.constants.ATTACK_TIME-atkTimeAdjustment[adjustRaio];
		this.timer=setTimeout(function(){ tgt.onEndAttack.call(tgt,me); },adjustedAttackTime);
	},

	onEndAttack:function(atkProfile){

		var game=this.game;
		var defProfile=this.profile;
		var defName=defProfile.defender;
		if (defName) {
			defProfile.defender=null;
			defProfile=game.profiles[defName];
		}

		var addPenalty=function(pen,profile,time,attacker){
			pen.push({ name:profile.mob?"boss":profile.name, time:time, attacker:attacker });
			for (var a in profile.assists) pen.push({name:a,time:time, attacker:attacker});
			return pen;
		};

		if ( atkProfile.hp==0 || defProfile.hp==0 || atkProfile.curAP<RPGMechanics.actionCostAP.hit ) {
			this.applyPenalty(addPenalty([],atkProfile,RPGMechanics.constants.NO_COOLDOWN_TIME,true));
			this.applyPenalty(addPenalty([],defProfile,RPGMechanics.constants.NO_COOLDOWN_TIME));
			atkProfile.assists=null;
			if (game.actors.boss) game.actors.boss.onAttackEnded(atkProfile); //so that boss clears his underAttack
			return;
		}
		
		var adjustedAtk={
			bossRatio:atkProfile.bossRatio, 
			livesLost:atkProfile.livesLost<8?atkProfile.livesLost:8,
			patk:1+atkProfile.patk, speed:atkProfile.speed, orbs:atkProfile.orbs
		};
		var adjustedDef={
			pdef:1+defProfile.pdef,
			bossRatio:defProfile.bossRatio, 
			livesLost:defProfile.livesLost<8?defProfile.livesLost:8,
			patk:1+defProfile.patk, speed:defProfile.speed, orbs:defProfile.orbs
		};
		var a,asp;
		for (a in atkProfile.assists) {
			asp=atkProfile.assists[a];
			if (asp.curAP<RPGMechanics.actionCostAP.hit) continue;
			adjustedAtk.patk+=(asp.patk+1);
			adjustedAtk.speed+=asp.speed;
			adjustedAtk.livesLost+=asp.livesLost;
		}
		if (atkProfile.assists) adjustedDef.pdef++;
		
		var chances=RPGMechanics.calcAtkChances(adjustedAtk,adjustedDef); // calc parry, evade, crit chances
		
		if (chances.crit.result) adjustedAtk.patk+=(atkProfile.patk||1);
		
		var parryEvadeSuccess=false, parryEvadeCost=0, haveEnoughAp;
		if (chances[defProfile.state]){ // tried to parry/evade
			haveEnoughAp=defProfile.curAP>=RPGMechanics.actionCostAP[defProfile.state];
			// if (haveEnoughAp) parryEvadeCost+=RPGMechanics.constants.AP_PARRY_EVADE_COST; //cost for trying
			parryEvadeSuccess = haveEnoughAp && chances[defProfile.state].result; //result
			if (!parryEvadeSuccess) parryEvadeCost+=RPGMechanics.constants.AP_MISS_COST; // add cost for failing
		}

		var noBlock=["attack","cast","assist"].indexOf(defProfile.state)>-1;
		var willBlock= !noBlock && parryEvadeCost==0;

		var apCosts;
		var gotHitCost=RPGMechanics.constants.AP_HIT_COST;

		var re={dmg:0,eventKey:'hitDamage'};

		if (parryEvadeSuccess) {
			re.eventKey=chances[defProfile.state].eventKey;
			re.chance=chances[defProfile.state].chance;
			apCosts=addPenalty([],atkProfile,RPGMechanics.constants.AP_ATTACK_COST+RPGMechanics.constants.AP_MISS_COST,true);
			apCosts=addPenalty(apCosts,defProfile,parryEvadeCost);
		} else {
			if (chances.crit.result) {
				gotHitCost*=2;
				re.eventKey=chances.crit.eventKey;
				re.chance=chances.crit.chance;
			}
			var pierceChance=RPGMechanics.adjustChanceWithOrbs("pierce",RPGMechanics.constants.BASIC_CHANCE/5,atkProfile,defProfile);
			var armorDegradeChance=RPGMechanics.adjustChanceWithOrbs("degrade",RPGMechanics.constants.BASIC_CHANCE,atkProfile,defProfile);
			armorDegradeChance+=0.1*(adjustedAtk.patk-defProfile.pdef);
			if ( willBlock && adjustedDef.pdef-adjustedAtk.patk>0) {
				if ( defProfile.armorEndurance==0){
					re.eventKey='hitPdefDecrease';
					if (defProfile.pdef>0) defProfile.pdef--;
					defProfile.armorEndurance=RPGMechanics.constants.ARMOR_ENDURANCE;
					apCosts=addPenalty([],atkProfile,RPGMechanics.constants.AP_ATTACK_COST/2,true);
					apCosts=addPenalty(apCosts,defProfile,RPGMechanics.constants.AP_ATTACK_COST/2);
				} else if (RPGMechanics.rollDice("fightArmorPierce",pierceChance)){
					re.eventKey='hitPierced';
					re.chance=pierceChance;
					defProfile.hp--;
					defProfile.wasHit=true;
					re.dmg=adjustedAtk.patk;
					apCosts=addPenalty([],atkProfile,RPGMechanics.constants.AP_ATTACK_COST,true);
					apCosts=addPenalty(apCosts,defProfile,RPGMechanics.constants.AP_ATTACK_COST/2);
				} else {
					re.eventKey='hitBlocked';
					if (RPGMechanics.rollDice("fightArmorDegrade",armorDegradeChance)) defProfile.armorEndurance--;
					apCosts=addPenalty([],atkProfile,RPGMechanics.constants.AP_ATTACK_COST,true);
					apCosts=addPenalty(apCosts,defProfile,RPGMechanics.constants.NO_COOLDOWN_TIME);
				}
			} else {
				defProfile.hp--;
				defProfile.wasHit=true;
				re.dmg=adjustedAtk.patk;
				apCosts=addPenalty([],atkProfile,RPGMechanics.constants.AP_ATTACK_COST,true);
				apCosts=addPenalty(apCosts,defProfile,gotHitCost+parryEvadeCost);
			}
		}
		
		this.applyPenalty(apCosts);
		atkProfile.assists=null;
		if (game.actors.boss) game.actors.boss.onAttackEnded(atkProfile);
		
		game.onResultHitTarget(re,atkProfile,defProfile);
	},

	startCastSpell:function(spell,tgt){
		var me=this;
		if (tgt) me.profile.target=tgt;
		this.setState(me.profile,"cast",spell);
		this.timer=setTimeout(function(){ me.onEndCastSpell(spell,tgt); },RPGMechanics.constants.CAST_TIME);
	},

	onEndCastSpell:function(spell,tgt){
		var game=this.game;
		var re={spell:spell,eventKey:'spellCast'};
		var srcProfile=this.profile;
		var tgtProfile=tgt?tgt.profile:srcProfile;
		this.setState(srcProfile,"active");
		this.timer=null;

		if (this.profile.hp==0 || tgtProfile.hp==0) {
			return;
		} else {
			srcProfile.mana--;
			// srcProfile.spells[spell].mp--;
			RPGMechanics.spells[spell](srcProfile,tgtProfile);
			if (tgt) tgt.refreshApStats.call(tgt,tgtProfile);
			else this.refreshApStats(tgtProfile);
		}
		game.onResultSpellCast(re,srcProfile,tgtProfile);
	}
	
};

module.exports=Player;
},{"./RPGMechanics":8}],10:[function(require,module,exports){
var RPGGame=require('./RPGGame');
var RPGMechanics=require("./RPGMechanics");

function RPGVersusGame(pars) {
	RPGGame.call(this, pars);
}

RPGVersusGame.prototype = new RPGGame;

RPGVersusGame.prototype.onStartBoard = function () {
	this.restoreLives();
	this.digitPocket={};
	this.lostCoords={};
	this.openFirstCell();
};

RPGVersusGame.prototype.onResetBoard = function (e) {
	this.inBattle=false;
	this.emitEvent('party', this.id, 'system', 'Message', 'Result: '+e.eventKey);
	this.emitEvent('party', this.id, 'game', 'ShowResultRPGVersus', e);
};

RPGVersusGame.prototype.onCells = function (re) {
	this.addCells(re.cells);
	this.addOrbs(re.user,this.calcOrbs(re.cells));
	this.openCells(re.cells);
};

RPGVersusGame.prototype.onBomb = function (re) {
	var coord=re.coords[0]+"_"+re.coords[1];
	if (!this.lostCoords[coord]){
		this.lostCoords[coord]=1;
		this.profiles[re.user].livesLost++;
		this.openCells(re.cells);
		this.emitEvent('party', this.id, 'game', 'UserLostLife', {user:re.user,livesLost:this.profiles[re.user].livesLost});
	}
};

RPGVersusGame.prototype.startBattle = function () {
	var rpg=RPGMechanics;
	
	this.inBattle=true;
	
	var stat=this.getGenericStat();

	for (var u in this.players){
		var userProfile=this.actors[u].adjustProfile({
			"maxhp":0,"patk":0,"pdef":0,"speed":0,"armorEndurance":RPGMechanics.constants.ARMOR_ENDURANCE,
			"level":8, "name":u, "state":"active", "livesLost":this.profiles[u].livesLost
		});
		userProfile.hp=userProfile.level-userProfile.livesLost+userProfile.maxhp;
		if (userProfile.hp<1) userProfile.hp=1;
		this.profiles[u]=userProfile;
	}
	
	for (var p in this.profiles) if (!this.players[p]) delete this.profiles[p];
	
	this.emitEvent('party', this.id, 'system', 'Message', 'Start versus battle');
	this.emitEvent('party', this.id, 'game', 'StartBattleVersus', {
		key:'startBattle',profiles:this.profiles, time:stat.time, loot:this.digitPocket
	});
};

RPGVersusGame.prototype.checkBattleComplete = function (re,atkProfile,defProfile) {
	var lastStand=[];
	for (var p in this.profiles) if (this.profiles[p].hp>0) lastStand.push(p);
	if (lastStand.length==1) this.resetBoard({
		eventKey:'endBattle', 
		won:lastStand[0], 
		loot:this.digitPocket,
		stat:this.getGenericStat()
	});
};

RPGVersusGame.prototype.onComplete = function (re) {
	this.addCells(re.cells);
	this.addOrbs(re.user,this.calcOrbs(re.cells));
	this.openCells(re.cells);
	this.openCells(this.board.mines);
	if (!this.inBattle) this.startBattle();
};

module.exports=RPGVersusGame;

},{"./RPGGame":7,"./RPGMechanics":8}],11:[function(require,module,exports){
var Game=require('./Game.js');

function RankGame(pars){
  Game.call(this,pars);
  this.bestTime=this.profiles[this.partyLeader][this.bSize];
  this.gamesPlayed=0;
  this.won=0;
  this.lost=0;
  this.winStreak=0;
  this.loseStreak=0;
};

RankGame.prototype=new Game;

RankGame.prototype.onStartBoard=function(){
  this.resetScore();
};

RankGame.prototype.onResetBoard=function(e){
  this.gamesPlayed++;
  if (e.win){
    this.winStreak++;
    this.loseStreak=0;
    this.won++;
  } else{
    this.winStreak=0;
    this.loseStreak++;
    this.lost++;
  }
  var stat=this.getGenericStat();
  stat.bestTime=this.bestTime;
  stat.result=e.win?'win':'fail',
  stat.gamesPlayed=this.gamesPlayed,
  stat.won=this.won,
  stat.lost=this.lost,
  stat.winPercentage=Math.round(100*this.won/this.gamesPlayed)+'%',
  stat.streak=this.winStreak?this.winStreak:this.loseStreak;
  this.emitEvent('party',this.id,'game','ShowResultRank',stat);
};

RankGame.prototype.onCells=function(re){
  this.openCells(re.cells);
};

RankGame.prototype.onBomb=function(re){
  this.openCells(this.board.mines);
  this.resetBoard(re);
};

RankGame.prototype.onComplete=function(re){
  this.openCells(re.cells);
  this.openCells(this.board.mines);
  re.win=1;
  var time=this.now/1000;
  if (!this.bestTime || time<this.bestTime){
    this.bestTime=time;
    this.emitEvent('server',null,null,'userNewBestTime',
                   {game:this.name,user:re.user,bSize:this.bSize,time:time,log:this.log});
  }
  this.resetBoard(re);
};

module.exports=RankGame;


},{"./Game.js":3}],12:[function(require,module,exports){
var Game=require('./Game.js');

function VersusGame(pars){
  Game.call(this,pars);
  this.totalTime=0;
//  this.startBoard();
};

VersusGame.prototype=new Game;

VersusGame.prototype.onResetBoard=function(re){
  //this.openCells(this.board.mines);
  this.totalTime+=this.now;
  var stat=this.getGenericStat();
  stat.winner=re.user;
  stat.totalTime=this.totalTime/1000,
  stat.score=this.score,
  this.emitEvent('server',null,null,'versusGameResult',stat);
  //this.resetScore();
  //this.resetBoard(re);
  this.totalTime=0;
};

VersusGame.prototype.onStartBoard=function(){
  this.resetScore();
  this.openFirstCell();
};

VersusGame.prototype.onCells=function(re){
  this.openCells(re.cells);
  if (re.user!='system')
    this.addPoints(re);
  //if (this.score[re.user]>=this.board.bombs*10){
  //  this.resetGame(re);
  //}
};

VersusGame.prototype.onBomb=function(re){
  this.addPoints(re);
  this.openCells(re.cells);
  this.setUserPenalty(re.user,2000);
};

VersusGame.prototype.onComplete=function(re){
  //this.totalTime+=this.now;
  this.addPoints(re);
  this.openCells(re.cells);
  this.openCells(this.board.mines);
  this.resetBoard(re);
};

module.exports=VersusGame;

},{"./Game.js":3}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],14:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[4])(4)
});
