import React, {Component} from 'react';
import ReactDom from 'react-dom';
import uuid from 'uuid/v1';
import ChatContainer from './ChatContainer.jsx';
import Header from './Header.jsx';
import Video from './Video.jsx';
import Controls from './Controls.jsx';
import QueueContainer from './QueueContainer.jsx';
import MyPopup from './popup.jsx';

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      currentUser: {name: ""},
      messages: [],
      users: [],
      count:0,
      lineInfo:["","",-1],//[first user in line's name, second user in line's name, position of the current user in line]
      lineLength: "",
      buttontext:"Request Control",
      time: 0,
      class: "request"
    };
    this.updateme = this.updateme.bind(this);
    this.updatename = this.updatename.bind(this);
    this.sendIt = this.sendIt.bind(this);
  }
  // this function just sends the JSON.stringified of the input. It's being passed to the controls component
  sendIt(obj) {
    this.ws.send(JSON.stringify(obj));
  }
//this function updates the chat list
  updateme (text,id,username) {
    var new_obj = [{username: username, content:text, id:uuid(), type: "postNotification"}];
    this.ws.send(JSON.stringify(new_obj[0]));
  }
//this function updates the name of the current user
  updatename (newname) {
    if(newname){
      var obj = {newname:newname, oldname: " ", type:"name"};
      this.ws.send(JSON.stringify(obj));
      this.setState({
        currentUser: {
          name: newname
        }
      }, ()=>{
        console.log(this.state.currentUser.name);
      });
    }

  }

  componentDidMount() {
    let nowInLead = false;
    this.ws = new WebSocket('ws://' + location.hostname + ':3001');
    this.ws.addEventListener('open', () => {

    });
    this.ws.addEventListener('message', (event) => {
      var temp = event.data;
      var data=JSON.parse(event.data);
      // console.log("message is",data);
      var mymass = {};
      if(data.type === "name"){
        var news = [{username:"" , content:(data.newname + " joined the page "), id:uuid()}];
        mymass = this.state.messages.concat(news);
        this.setState({messages: mymass});
      }else if(data.type === "time" ){
        if(this.state.lineInfo[this.state.lineInfo.length - 1] !== 0){
          this.setState({time:data.time});
          if(this.state.lineInfo[this.state.lineInfo.length - 1] === -1){
            let newlineInfo = [data.first, data.second, -1];
            this.setState({lineInfo: newlineInfo, lineLength:data.lineLength});
          }
        }

      }else if(data.type === "postNotification"){
        mymass = this.state.messages.concat([data]);
        this.setState({messages: mymass});

      }else if(data.type === "count"){
        this.setState({count:data.count})

      }else if(data.type === "lineInfo"){
        this.setState({lineInfo: data.lineInfo});
        if(this.state.lineInfo.length < 4){
          this.setState({lineLength: ""});

        }else{
          this.setState({lineLength: data.lineInfo.length - 3 + "more in line"});

        }
        if(data.lineInfo[data.lineInfo.length - 1] === -1){
          this.setState({buttontext:"Request Control", class: "request"});
          console.log(this.state.buttontext);
        }else if(data.lineInfo[data.lineInfo.length - 1] === 0){
          this.setState({buttontext:"You are in command", class:"inCommand"});
          if(!nowInLead){
            nowInLead = true;
            let t = new Date().getTime();
            let numSecondsPassed = 0;
            let interval = setInterval(() => {
               numSecondsPassed++;
              this.setState({time:30 - numSecondsPassed});
              this.ws.send(JSON.stringify({type:"time", time: (30 - numSecondsPassed), lineLength:this.state.lineLength, first: this.state.lineInfo[0], second:this.state.lineInfo[1]}));
              if (numSecondsPassed == 30) {
                clearInterval(interval);
                nowInLead = false;
                this.setState({time:0});
              }
            },1000);
          }
        }else{
          console.log(this.state.buttontext);
          this.setState({buttontext:"You are number " + String(data.lineInfo[data.lineInfo.length - 1]) + " in line", class: "inLine"});
        }
      }
    });
    this.ws.onerror = e => this.setState({ error: 'WebSocket error' })
    this.ws.onclose = e => !e.wasClean && this.setState({ error: `WebSocket error: ${e.code} ${e.reason}` })
    console.log("componentDidMount <App />");
    setTimeout(() => {
    console.log("Simulating incoming message");
    });
    MyPopup.plugins().prompt('', 'Type your name', this.updatename);
  }
  componentWillUnmount() {
    this.ws.close()
  }
  render() {

    return (
      <div className="container">
        <MyPopup className= "popup" closeBtn={false} closeOnOutsideClick={false}  />
        <div className="main">
          <Header />
          <Video />
          <Controls sendIt={this.sendIt}/>
        </div>
        <div className="sidebar">
          <QueueContainer class={this.state.class} time={this.state.time} buttontext={this.state.buttontext} lineLength={this.state.lineLength} currentUser={this.state.currentUser} lineInfo={this.state.lineInfo} sendIt={this.sendIt} />

          <ChatContainer count={this.state.count} Messages={this.state.messages} currentUser={this.state.currentUser} updatename={this.updatename} updateme={this.updateme}/>
        </div>
      </div>
    );
  }
}

export default App;
