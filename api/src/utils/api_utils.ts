import { ethers } from "ethers"



const getHost =(): string =>{
  return process.env.HOST || '127.0.0.1'
}


const getPort = () : number =>{

    return Number(process.env.PORT) || 3000
}

const fetchEnsName = async (walletAddress : string,  infuraKey : string): Promise<string>=>{
  let ensName="";
  try {
    // Create an Ethereum provider
    const provider = new ethers.providers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${infuraKey}`
    );
    
    // Look up ENS name for the address
     ensName = await provider.lookupAddress(walletAddress) ?? "";
    
   
  } catch (error) {
    console.error('Error fetching ENS name:', error);
    
    // Continue with creation without ENS name
  }

  return ensName
}




export { getHost, getPort, fetchEnsName}