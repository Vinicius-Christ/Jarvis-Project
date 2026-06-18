import http from 'http';

http.get('http://localhost:3000/api/system/health', {
  headers: {
    // try to mimic the browser
    'Host': 'ais-dev-xxx.us-west2.run.app'
  }
}, (res) => {
  let data = '';
  console.log('STATUS:', res.statusCode);
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('BODY:', data.substring(0, 500)));
});
