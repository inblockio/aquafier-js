


const getHost =(): string =>{
  return process.env.HOST || '127.0.0.1'
}


const getPort = () : number =>{

    return Number(process.env.PORT) || 3000
}






export { getHost, getPort}