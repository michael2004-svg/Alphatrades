const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089')
ws.onopen = () => { 
  console.log('OPEN')
  ws.send(JSON.stringify({ ticks: '1HZ10V', subscribe: 1 }))
}
ws.onmessage = (e) => console.log('MSG', JSON.parse(e.data))
ws.onerror = (e) => console.log('ERR', e)
ws.onclose = (e) => console.log('CLOSE code:', e.code, e.reason)	
