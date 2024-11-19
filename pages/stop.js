import { createWidget, widget, align, text_style, redraw, deleteWidget } from "@zos/ui";
import { log as Logger, px } from "@zos/utils";
import { Geolocation } from "@zos/sensor";
import { push } from '@zos/router';
import { updateStatusBarTitle } from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../utils/config/device";

const geolocation = new Geolocation();

const logger = Logger.getLogger("fetch_api");
const { messageBuilder } = getApp()._options.globalData;
const PILL_HEIGHT = 90;
const REFRESH = 30000;
let data = null;
let data2 = null;
let lastUpdated = 0;

Page({
  state: {},
  onInit(params) {
    // convert the param to json from text
    data = JSON.parse(params);
    data2 = JSON.parse(params);
    updateStatusBarTitle("Valenbisi | " + data.stopName + " (" + data.stopId + ")");
    logger.info("Received stop data", data);
  },
  build() {
    const viewContainer2 = createWidget(widget.GROUP, {
      x: px(0),
      y: px(100),
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT - px(100),
    });

    viewContainer2.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: px(190),
      color: 0x181818,
      radius: px(30)
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: 0,
      y: px(20),
      w: DEVICE_WIDTH - px(30),
      h: px(46),
      text_size: px(28),
      color: 0xcccccc,
      align_h: align.RIGHT,
      align_v: align.TOP,
      text: data.stopDistance + " m",
    });

    viewContainer2.createWidget(widget.IMG, {
      x: px(30),
      y: px(20),
      w: px(70),
      h: px(60),
      src: data.stopBikes < 3 ? "/bikes_red.png" : "/bikes.png"
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30 + 66),
      y: px(20),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(36),
      color: data.stopBikes < 3 ? 0xff6666 : 0xffffff, // Light red if bikes < 3, otherwise white
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: `${data.stopBikes}`,
    });

    viewContainer2.createWidget(widget.IMG, {
      x: px(30 + 2 * 66 - (data.stopBikes < 10 ? 20 : 0)),
      y: px(20),
      w: px(70),
      h: px(60),
      src: data.stopStands < 3 ? "/stands_red.png" : "/stands.png"
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30 + 3 * 66 - (data.stopBikes < 10 ? 20 : 0)),
      y: px(20),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(36),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: `${data.stopStands}`,
    });
    

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30),
      y: px(70),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(36),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.TOP,
      text: `${data.stopId} | ${data.stopName}`,
    });

    viewContainer2.createWidget(widget.TEXT, {
      x: px(30),
      y: px(120),
      w: DEVICE_WIDTH - px(60),
      h: px(46),
      text_size: px(28),
      color: 0xcccccc,
      align_h: align.LEFT,
      align_v: align.BOTTOM,
      text_style: text_style.ELLIPSIS,
      text: `${data.stopUbica}`,
    });

    loading = createWidget(widget.TEXT, {
      x: px(0),
      y: px(280),
      w: DEVICE_WIDTH,
      h: px(100),
      text: "Loading stop " + data.stopId + "...",
      text_size: px(36),
      color: 0x222222,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
    });

    setInterval(() => {
      redraw();
      this.getStopData();
    }, REFRESH);
  },
  getStopData() {
    geolocation.start();
    const latitude = geolocation.getLatitude();
    const longitude = geolocation.getLongitude() * -1;
    const stopId = data.stopId;

    messageBuilder
      .request({
        method: "GET_BIKE_STOP",
        params: {
          latitude,
          longitude,
          stopId,
        },
      })
      .then((data) => {
        const viewContainer = createWidget(widget.VIEW_CONTAINER, {
          x: px(0),
          y: px(300),
          w: DEVICE_WIDTH,
          h: DEVICE_HEIGHT - px(300),
        });

        let totalIndex = 0;
        logger.info("Received transport data", data.result);
        if (data && data.result) {
          data.result.forEach((bike, index) => {
            lastUpdated = bike.updatedAt;

              viewContainer.createWidget(widget.IMG, {
                x: px(30),
                y: px(20) + px(index * (PILL_HEIGHT + 10)),
                src: `/shield.png`,
              });

              viewContainer.createWidget(widget.TEXT, {
                x: px(40),
                y: px(25) + px(index * (PILL_HEIGHT + 10)),
                w: px(46),
                h: px(46),
                text_size: px(36),
                color: 0xcccccc,
                align_h: align.CENTER_H,
                align_v: align.CENTER_V,
                text: `${bike.standNumber}`,
              });

               viewContainer.createWidget(widget.TEXT, {
                x: px(120),
                y: px(25) + px(index * (PILL_HEIGHT + 10)),
                w: px(150),
                h: px(46),
                text_size: px(36),
                color: 0xffffff,
                align_h: align.LEFT,
                align_v: align.CENTER_V,
                text: `${bike.number}`,
              });

              viewContainer.createWidget(widget.TEXT, {
                x: 0,
                y: px(10) + px(index * (PILL_HEIGHT + 10)),
                w: DEVICE_WIDTH - px(20),
                h: px(46),
                text_size: px(28),
                color: (bike.rating.value >= 95) ? 0x66ff66 : 0xffffff, // Green if minutes <= 5 or text is "Now", otherwise light gray
                align_h: align.RIGHT,
                align_v: align.TOP,
                text: bike.rating.value + " / 100",
              });

              viewContainer.createWidget(widget.TEXT, {
                x: 0,
                y: px(50) + px(index * (PILL_HEIGHT + 10)),
                w: DEVICE_WIDTH - px(20),
                h: px(46),
                text_size: px(28),
                color: 0xcccccc, // Green if minutes <= 5 or text is "Now", otherwise light gray
                align_h: align.RIGHT,
                align_v: align.TOP,
                text: bike.rating.count + " votes",
              });

              totalIndex += 1;
          });
        } else {
          viewContainer.createWidget(widget.TEXT, {
            x: 0,
            y: (DEVICE_HEIGHT - px(46)) / 2, // Center vertically
            w: DEVICE_WIDTH,
            h: px(46),
            text_size: px(36),
            color: 0xcccccc, // Light gray color
            align_h: align.CENTER_H,
            align_v: align.CENTER_V,
            text: "No bikes available",
          });
        }

        viewContainer.createWidget(widget.TEXT, {
          x: px(30),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10)),
          w: DEVICE_WIDTH - px(60),
          h: px(46),
          text_size: px(28),
          color: 0x1a1a1a,
          align_h: align.LEFT,
          align_v: align.TOP,
          text: "Last updated: " + lastUpdated,
        });

        totalIndex += 1;

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10)),
          w: DEVICE_WIDTH,
          h: px(60),
          text: "View on map",
          normal_color: 0x000000,
          press_color: 0x1a1a1a,
          radius: px(10),
          text_size: px(36),
          color: 0x262626,
          click_func: () => {
            push({
              url: 'pages/qr',
              params: {
                latitude: data2.stopLatitude,
                longitude: data2.stopLongitude
              },
            });
          },
        });

        totalIndex += 1;

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10)),
          w: DEVICE_WIDTH,
          h: px(60),
          text: "Refresh",
          normal_color: 0x000000,
          press_color: 0x1a1a1a,
          radius: px(10),
          text_size: px(36),
          color: 0x262626,
          click_func: () => {
            loading = createWidget(widget.TEXT, {
              x: px(0),
              y: px(280),
              w: DEVICE_WIDTH,
              h: DEVICE_HEIGHT,
              text: "Loading...",
              text_size: px(36),
              color: 0x1a1a1a,
              align_h: align.CENTER_H,
              align_v: align.CENTER_V,
            });
            deleteWidget(viewContainer);
            this.getStopData();
          },
        });
        deleteWidget(loading);

        setTimeout(() => {
          deleteWidget(viewContainer);
        }, REFRESH);
      })
      .catch((error) => {
        logger.error("Error receiving transport data", error);
      });
  },
});
