import { createContext, useState } from "react";
import jsTPS from "../common/jsTPS";
import api from "../api";
import MoveItem_Transaction from "../transactions/MoveItem_Transaction";
import ChangeItem_Transaction from "../transactions/ChangeItem_Transaction";
export const GlobalStoreContext = createContext({});
/*
    This is our global data store. Note that it uses the Flux design pattern,
    which makes use of things like actions and reducers. 
    
    @author McKilla Gorilla
*/

// THESE ARE ALL THE TYPES OF UPDATES TO OUR GLOBAL
// DATA STORE STATE THAT CAN BE PROCESSED
export const GlobalStoreActionType = {
  CHANGE_LIST_NAME: "CHANGE_LIST_NAME",
  CLOSE_CURRENT_LIST: "CLOSE_CURRENT_LIST",
  LOAD_ID_NAME_PAIRS: "LOAD_ID_NAME_PAIRS",
  SET_CURRENT_LIST: "SET_CURRENT_LIST",
  SET_LIST_NAME_EDIT_ACTIVE: "SET_LIST_NAME_EDIT_ACTIVE",
};

// WE'LL NEED THIS TO PROCESS TRANSACTIONS
const tps = new jsTPS();

// WITH THIS WE'RE MAKING OUR GLOBAL DATA STORE
// AVAILABLE TO THE REST OF THE APPLICATION
export const useGlobalStore = () => {
  // THESE ARE ALL THE THINGS OUR DATA STORE WILL MANAGE
  const [store, setStore] = useState({
    idNamePairs: [],
    currentList: null,
    newListCounter: 0,
    listNameActive: false,
    itemActive: false,
    listMarkedForDeletion: null,
  });

  // HERE'S THE DATA STORE'S REDUCER, IT MUST
  // HANDLE EVERY TYPE OF STATE CHANGE
  const storeReducer = (action) => {
    const { type, payload } = action;
    switch (type) {
      // LIST UPDATE OF ITS NAME

      case GlobalStoreActionType.ADD_LIST: {
        return setStore({
          idNamePairs: store.idNamePairs,
          currentList: store.currentList,
          newListCounter: store.newListCounter++,
          isListNameEditActive: store.isItemEditActive,
          isItemEditActive: store.isItemEditActive,
          listMarkedForDeletion: store.listMarkedForDeletion,
        });
      }
      case GlobalStoreActionType.CHANGE_LIST_NAME: {
        return setStore({
          idNamePairs: payload.idNamePairs,
          currentList: payload.top5List,
          newListCounter: store.newListCounter,
          isListNameEditActive: false,
          isItemEditActive: false,
          listMarkedForDeletion: null,
        });
      }
      // STOP EDITING THE CURRENT LIST
      case GlobalStoreActionType.CLOSE_CURRENT_LIST: {
        return setStore({
          idNamePairs: store.idNamePairs,
          currentList: null,
          newListCounter: store.newListCounter,
          isListNameEditActive: false,
          isItemEditActive: false,
          listMarkedForDeletion: null,
        });
      }
      // GET ALL THE LISTS SO WE CAN PRESENT THEM
      case GlobalStoreActionType.LOAD_ID_NAME_PAIRS: {
        return setStore({
          idNamePairs: payload,
          currentList: null,
          newListCounter: store.newListCounter,
          isListNameEditActive: false,
          isItemEditActive: false,
          listMarkedForDeletion: null,
        });
      }
      // UPDATE A LIST
      case GlobalStoreActionType.SET_CURRENT_LIST: {
        return setStore({
          idNamePairs: store.idNamePairs,
          currentList: payload,
          newListCounter: store.newListCounter,
          isListNameEditActive: false,
          isItemEditActive: false,
          listMarkedForDeletion: null,
        });
      }
      // START EDITING A LIST NAME
      case GlobalStoreActionType.SET_LIST_NAME_EDIT_ACTIVE: {
        return setStore({
          idNamePairs: store.idNamePairs,
          currentList: payload,
          newListCounter: store.newListCounter,
          isListNameEditActive: true,
          isItemEditActive: false,
          listMarkedForDeletion: null,
        });
      }
      default:
        return store;
    }
  };
  // THESE ARE THE FUNCTIONS THAT WILL UPDATE OUR STORE AND
  // DRIVE THE STATE OF THE APPLICATION. WE'LL CALL THESE IN
  // RESPONSE TO EVENTS INSIDE OUR COMPONENTS.

  store.addList = function () {
    let newList = {
      items: ["?", "?", "?", "?", "?"],
      name: "Untitled" + store.newListCounter,
    };

    async function asynceAddList(newList) {
      let response = await api.createTop5List(newList);
      store.setCurrentList(response.data.top5List._id);
    }

    storeReducer({ type: GlobalStoreActionType.ADD_LIST, payload: {} });
    // setStore(prev => {
    //     return {...prev, newListCounter: prev.newListCounter++};
    // })
    asynceAddList(newList);
  };

  // THIS FUNCTION PROCESSES CHANGING A LIST NAME
  store.changeListName = function (id, newName) {
    // GET THE LIST
    async function asyncChangeListName(id) {
      let response = await api.getTop5ListById(id);
      if (response.data.success) {
        let top5List = response.data.top5List;
        top5List.name = newName;
        async function updateList(top5List) {
          response = await api.updateTop5ListById(top5List._id, top5List);
          if (response.data.success) {
            async function getListPairs(top5List) {
              response = await api.getTop5ListPairs();
              if (response.data.success) {
                let pairsArray = response.data.idNamePairs;
                storeReducer({
                  type: GlobalStoreActionType.CHANGE_LIST_NAME,
                  payload: {
                    idNamePairs: pairsArray,
                    top5List: top5List,
                  },
                });
              }
            }
            getListPairs(top5List);
          }
        }
        updateList(top5List);
      }
    }
    asyncChangeListName(id);
  };

  // THIS FUNCTION PROCESSES CLOSING THE CURRENTLY LOADED LIST
  store.closeCurrentList = function () {
    tps.clearAllTransactions();
    storeReducer({
      type: GlobalStoreActionType.CLOSE_CURRENT_LIST,
      payload: {},
    });
    store.disableCloseButton();
    store.changeRedoButton();
    store.changeUndoButton();
  };

  // THIS FUNCTION LOADS ALL THE ID, NAME PAIRS SO WE CAN LIST ALL THE LISTS
  store.loadIdNamePairs = function () {
    async function asyncLoadIdNamePairs() {
      const response = await api.getTop5ListPairs();
      if (response.data.success) {
        let pairsArray = response.data.idNamePairs;
        storeReducer({
          type: GlobalStoreActionType.LOAD_ID_NAME_PAIRS,
          payload: pairsArray,
        });
      } else {
        console.log("API FAILED TO GET THE LIST PAIRS");
      }
    }

    asyncLoadIdNamePairs();
    store.disableCloseButton();
    store.changeRedoButton();
    store.changeUndoButton();
  };

  // THE FOLLOWING 8 FUNCTIONS ARE FOR COORDINATING THE UPDATING
  // OF A LIST, WHICH INCLUDES DEALING WITH THE TRANSACTION STACK. THE
  // FUNCTIONS ARE setCurrentList, addMoveItemTransaction, addUpdateItemTransaction,
  // moveItem, updateItem, updateCurrentList, undo, and redo
  store.setCurrentList = function (id) {
    async function asyncSetCurrentList(id) {
      let response = await api.getTop5ListById(id);
      if (response.data.success) {
        let top5List = response.data.top5List;

        response = await api.updateTop5ListById(top5List._id, top5List);
        if (response.data.success) {
          storeReducer({
            type: GlobalStoreActionType.SET_CURRENT_LIST,
            payload: top5List,
          });
          store.history.push("/top5list/" + top5List._id);
        }
      }
    }
    asyncSetCurrentList(id);
    store.enableCloseButton();
    store.changeRedoButton();
    store.changeUndoButton();
  };

  store.hideDeleteListModal = function () {
    storeReducer({
      type: GlobalStoreActionType.SET_CURRENT_LIST,
      payload: null,
    });

    let modal = document.getElementById("delete-modal");
    modal.classList.remove("is-visible");
  };

  store.deleteMarkedList = function () {
    async function asyncDeleteList() {
      let response = await api.deleteTop5ListById(store.currentList._id);
      if (response.data.success) {
        console.log(store.currentList);
        let modal = document.getElementById("delete-modal");
        modal.classList.remove("is-visible");

        storeReducer({
          type: GlobalStoreActionType.SET_CURRENT_LIST,
          payload: null,
        });
      }
    }

    asyncDeleteList().catch((e) => {
      let modal = document.getElementById("delete-modal");
      modal.classList.remove("is-visible");
    });
    store.loadIdNamePairs();
  };

  store.addMoveItemTransaction = function (start, end) {
    let transaction = new MoveItem_Transaction(store, start, end);
    tps.addTransaction(transaction);
    store.changeRedoButton();
    store.changeUndoButton();
  };

  store.addChangeItemTransaction = function (index, oldName, newName) {
    let transaction = new ChangeItem_Transaction(
      store,
      index,
      oldName,
      newName
    );
    tps.addTransaction(transaction);
    store.changeRedoButton();
    store.changeUndoButton();
  };
  store.moveItem = function (start, end) {
    start -= 1;
    end -= 1;
    if (start < end) {
      let temp = store.currentList.items[start];
      for (let i = start; i < end; i++) {
        store.currentList.items[i] = store.currentList.items[i + 1];
      }
      store.currentList.items[end] = temp;
    } else if (start > end) {
      let temp = store.currentList.items[start];
      for (let i = start; i > end; i--) {
        store.currentList.items[i] = store.currentList.items[i - 1];
      }
      store.currentList.items[end] = temp;
    }

    // NOW MAKE IT OFFICIAL
    store.updateCurrentList();

    store.changeRedoButton();
    store.changeUndoButton();
  };

  store.showDeleteList = function (id) {
    async function asyncSetCurrentList(id) {
      let response = await api.getTop5ListById(id);
      if (response.data.success) {
        let top5List = response.data.top5List;

        response = await api.updateTop5ListById(top5List._id, top5List);
        if (response.data.success) {
          storeReducer({
            type: GlobalStoreActionType.SET_CURRENT_LIST,
            payload: top5List,
          });
        }
      }
    }
    asyncSetCurrentList(id);

    let modal = document.getElementById("delete-modal");
    modal.classList.add("is-visible");
  };

  store.updateCurrentList = function (index, name) {
    store.currentList.items[index] = name;
    async function asyncUpdateCurrentList() {
      const response = await api.updateTop5ListById(
        store.currentList._id,
        store.currentList
      );
      if (response.data.success) {
        storeReducer({
          type: GlobalStoreActionType.SET_CURRENT_LIST,
          payload: store.currentList,
        });
      }
    }
    asyncUpdateCurrentList();
  };
  store.undo = function () {
    tps.undoTransaction();

    store.changeRedoButton();
    store.changeUndoButton();
  };
  store.redo = function () {
    tps.doTransaction();

    store.changeRedoButton();
    store.changeUndoButton();
  };

  store.disableCloseButton = function (){
    let button = document.getElementById("close-button");
    button.classList.add("top5-button-disabled");
  }

  store.enableCloseButton = function(){
    let button = document.getElementById("close-button");
    button.classList.remove("top5-button-disabled");
  }

  store.changeRedoButton = function(){
    if(!tps.hasTransactionToRedo()){
        let button = document.getElementById("redo-button");
        button.classList.add("top5-button-disabled");
    }else{
        let button = document.getElementById("redo-button");
        button.classList.remove("top5-button-disabled");
    }
  }

  store.changeUndoButton = function(){
      if(!tps.hasTransactionToUndo()){
          let button = document.getElementById("undo-button");
          button.classList.add("top5-button-disabled");
      }else{
          let button = document.getElementById("undo-button");
          button.classList.remove("top5-button-disabled");
      }
  }

  // THIS FUNCTION ENABLES THE PROCESS OF EDITING A LIST NAME
  store.setIsListNameEditActive = function () {
    storeReducer({
      type: GlobalStoreActionType.SET_LIST_NAME_EDIT_ACTIVE,
      payload: null,
    });
  };

  // THIS GIVES OUR STORE AND ITS REDUCER TO ANY COMPONENT THAT NEEDS IT
  return { store, storeReducer };
};
