import jsTPS_Transaction from "../common/jsTPS"

/**
 * ChangeItem_Transaction
 * 
 * This class represents a transaction that updates the text
 * for a given item. It will be managed by the transaction stack.
 * 
 * @author McKilla Gorilla
 * @author ?
 */
export default class ChangeItem_Transaction extends jsTPS_Transaction {
    constructor(initModel, initId, initOldText, initNewText) {
        super();
        this.model = initModel;
        this.id = initId;
        this.oldText = initOldText;
        this.newText = initNewText;
    }

    doTransaction() {
        this.model.updateCurrentList(this.id, this.newText);
    }
    
    undoTransaction() {
        this.model.updateCurrentList(this.id, this.oldText);
    }
}