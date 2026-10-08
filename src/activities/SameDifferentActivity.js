import { StoryChoiceActivity } from './StoryChoiceActivity.js';
export class SameDifferentActivity extends StoryChoiceActivity {
  start(){
    const same=Boolean(this.definition.same);
    this.definition={...this.definition,correctId:same?'same':'different',storyText:this.definition.storyText??'Are these the same or different?',choices:[{id:'same',label:'SAME',kind:'circle',color:'green',x:720,y:690,correct:same},{id:'different',label:'DIFFERENT',kind:'triangle',color:'orange',x:1200,y:690,correct:!same}]};
    super.start();
  }
}
