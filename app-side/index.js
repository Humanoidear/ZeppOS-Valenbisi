import { MessageBuilder } from "../shared/message-side";

const messageBuilder = new MessageBuilder();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

async function fetchTransportData(ctx, params) {
  const { latitude, longitude } = params;

  const url = `https://api.jcdecaux.com/vls/v3/stations?apiKey=frifk0jbxfefqqniqez09tw4jvk37wyf823b5j1i&contract=valence`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const resBody = await res.json();
    if (res.status === 204) {
      ctx.response({
        data: { result: "No Content" },
      });
      return;
    }

    // Filter and calculate the distance for each stop
    const stopsData = resBody.map(stop => {
      const stopLatitude = stop.position.latitude;
      const stopLongitude = stop.position.longitude;
      const distance = calculateDistance(latitude, longitude, stopLatitude, stopLongitude) * 1000; // Convert to meters
      return {
        ...stop,
        distance: Math.trunc(distance)
      };
    }).filter(stop => stop.distance <= 300); // Filter stops within 500 meters

    // Sort the stops by distance
    stopsData.sort((a, b) => a.distance - b.distance);

    console.log("Stops data:", stopsData);

    let length = stopsData.length;
    ctx.response({
      data: { result: stopsData, length: length },
    });

  } catch (error) {
    console.error("Error fetching transport data:", error);
    ctx.response({
      data: { result: "ERROR" },
    });
  }
}

async function fetchTransportDataStop(ctx, params) {
  const { stopId } = params;
  // Fetch POST https://api.cyclocity.fr/auth/environments/PRD/client_tokens, then get access token
  let accessToken = await fetch('https://api.cyclocity.fr/auth/environments/PRD/client_tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "code": "vls.web.valence:PRD",
      "key": "5baec26027069c8ff4358f7f8faf43e0ce2c1e32f6d919cc6006a4ee6bfdf5ac"
    })
  });

  console.log('Access token response:', accessToken);
  accessToken = await accessToken.json();
  accessToken = accessToken.accessToken;
  console.log('Access token:', accessToken);

  try {
    const bikeResponse = await fetch(`https://api.cyclocity.fr/contracts/valence/bikes?stationNumber=${stopId}`, {
      method: 'GET',
      headers: {
        'Host': 'api.cyclocity.fr',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
        'Accept': 'application/vnd.bikes.v4+json',
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Content-Type': 'application/vnd.bikes.v4+json',
        'Authorization': `Taknv1 ${accessToken}`,
        'Origin': 'https://www.valenbisi.es',
        'DNT': '1',
        'Sec-GPC': '1',
        'Connection': 'keep-alive',
        'Referer': 'https://www.valenbisi.es/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    });

    console.log('Bike response:', bikeResponse);
    if (!bikeResponse.ok) {
      const errorText = await bikeResponse.text();
      console.error('Error response:', errorText);
      throw new Error('Failed to fetch bike information');
    }

    const bikeData = await bikeResponse.json();
    console.log('Bike data:', bikeData);

    bikeData.sort((a, b) => b.rating.value - a.rating.value);
    ctx.response({
      data: { result: bikeData }
    });

  } catch (error) {
    console.error('Error:', error);
    ctx.response({
      data: { result: 'ERROR', message: error.message }
    });
  }
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => { });

    messageBuilder.on("request", (ctx) => {
      const jsonRpc = messageBuilder.buf2Json(ctx.request.payload);
      if (jsonRpc.method === "GET_BIKE") {
        return fetchTransportData(ctx, jsonRpc.params);
      } else if (jsonRpc.method === "GET_BIKE_STOP") {
        return fetchTransportDataStop(ctx, jsonRpc.params);
      }
    });
  },
  onDestroy() { },
});