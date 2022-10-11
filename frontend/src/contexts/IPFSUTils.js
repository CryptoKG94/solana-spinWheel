import { create } from 'ipfs-http-client'
import axios from 'axios';
//import IPFS from 'nano-ipfs-store'
let all = require('it-all')

let client = create('https://ipfs.infura.io:5001/api/v0');

const uploadFileToIPFS = async (files) => {
    let lists = [];
    try{
        for(let i = 0;i<files.length;i++){
            const added = await client.add(files[i])
            const url = `https://ipfs.infura.io/ipfs/${added.path}`
            ////console.log("[GD], FileName = ", files[i].name, ", Hash: ", added.path)
            lists.push(url)
        }
        return lists
    } catch(err) {
        ////console.log("Error uploading file: ", err)
        return []
    }    
}

const uploadFolderToIPFS = async (files) => {
    try{
        /*let fileObjectsArray = Array.from(files).map((file) => {
            return {
                path: file.name,
                content: file
            }
        })*/
        const results = await all(
            client.addAll(files, { wrapWithDirectory: true })
        )
        const length = results.length
        const filesHash = results[length - 1].cid._baseCache.get('z')
        const filesUrl = 'https://ipfs.infura.io/ipfs/' + filesHash
        return filesUrl
    } catch(err) {
        //console.log("[GD], Error uploading file: ", err)
        return ""
    }    
}

const uploadTextToIPFS = async (data) => {
    try{
        let doc = JSON.stringify(data)
        const added = await client.add(doc)
        return added.path
    }catch(err){
        ////console.log("Error: ", err)
        return null
    }
}

const loadFromIPFS = async (url) => {
    let res = await axios.get(`https://ipfs.infura.io/ipfs/${url}`)
    return res;
}


const IPFSUtils = {
    uploadFileToIPFS,
    uploadFolderToIPFS,
    uploadTextToIPFS,
    loadFromIPFS
}


export default IPFSUtils;