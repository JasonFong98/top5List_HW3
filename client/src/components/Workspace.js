import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import React, { useEffect, useState } from "react";
import Top5Item from './Top5Item.js'
import { GlobalStoreContext } from '../store'
/*
    This React component lets us edit a loaded list, which only
    happens when we are on the proper route.
    
    @author McKilla Gorilla
*/
function Workspace() {
    const { store } = useContext(GlobalStoreContext);
    const [editActive, setEditActive] = useState(false);
    store.history = useHistory();

    let changeActive = () => {
        

        if(!editActive){
            for(let i=1; i <= 5; i++){
                document.getElementById("edit-item-"+i).classList.add("list-card-button-disabled");
            }
        }else{
            for(let i =1; i <= 5; i++){
                document.getElementById("edit-item-"+i).classList.remove("list-card-button-disabled");
            }
        };

        setEditActive(!editActive);
    }

    let editItems = "";
    if (store.currentList) {
        editItems = 
            <div id="edit-items">
                {
                    store.currentList.items.map((item, index) => (
                        <Top5Item 
                            id={'top5-item-' + (index+1)}
                            key={'top5-item-' + (index+1)}
                            text={item}
                            index={index} 
                            changeActive = {changeActive}
                        />
                    ))
                }
            </div>;
    }

    return (
        <div id="top5-workspace">
            <div id="workspace-edit">
                <div id="edit-numbering">
                    <div className="item-number">1.</div>
                    <div className="item-number">2.</div>
                    <div className="item-number">3.</div>
                    <div className="item-number">4.</div>
                    <div className="item-number">5.</div>
                </div>
                {editItems}
            </div>
        </div>
    )
}

export default Workspace;