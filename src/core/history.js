// import helper from '../helper';

export default class History {
  constructor(enabled = true) {
    this.undoItems = [];
    this.redoItems = [];
    this.enabled = enabled;
  }

  add(data) {
    if(!this.enabled) return;
    this.undoItems.push(JSON.stringify(data));
    this.redoItems = [];
  }

  canUndo() {
    if(!this.enabled) return;
    return this.undoItems.length > 0;
  }

  canRedo() {
    if(!this.enabled) return;
    return this.redoItems.length > 0;
  }

  undo(currentd, cb) {
    if(!this.enabled) return;
    const { undoItems, redoItems } = this;
    if (this.canUndo()) {
      redoItems.push(JSON.stringify(currentd));
      cb(JSON.parse(undoItems.pop()));
    }
  }

  redo(currentd, cb) {
    if(!this.enabled) return;
    const { undoItems, redoItems } = this;
    if (this.canRedo()) {
      undoItems.push(JSON.stringify(currentd));
      cb(JSON.parse(redoItems.pop()));
    }
  }
}
