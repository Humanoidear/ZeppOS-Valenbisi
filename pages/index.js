import { createWidget, widget, align, text_style, redraw, deleteWidget } from "@zos/ui";
import { log as Logger, px } from "@zos/utils";
import { Geolocation } from "@zos/sensor";
import { push } from '@zos/router';
import { updateStatusBarTitle } from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../utils/config/device";

const geolocation = new Geolocation();

const logger = Logger.getLogger("fetch_api");
const { messageBuilder } = getApp()._options.globalData;
const PILL_HEIGHT = 190;
const REFRESH = 30000;

Page({
  state: {},
  onInit() {
    updateStatusBarTitle("Valenbisi | Closest Stops");
  },
  build() {
    // Call getStops on page load
    loading = createWidget(widget.TEXT, {
      x: px(0),
      y: px(0),
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      text: "Loading...",
      text_size: px(36),
      color: 0xcccccc,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
    });

    setInterval(() => {
      redraw();
      this.getStops();
    }, REFRESH);
  },

  getStops() {
    geolocation.start();
    const latitude = geolocation.getLatitude();
    const longitude = geolocation.getLongitude() * -1;

    messageBuilder
      .request({
        method: "GET_BIKE",
        params: {
          latitude,
          longitude,
        },
      })
      .then((data) => {


        const viewContainer = createWidget(widget.VIEW_CONTAINER, {
          x: px(0),
          y: px(100),
          w: DEVICE_WIDTH,
          h: DEVICE_HEIGHT - px(100),
        });

        let totalIndex = 0;

        if (Array.isArray(data.result) && data.result.length === 0) {
          viewContainer.createWidget(widget.FILL_RECT, {
            x: px(0),
            y: px(20),
            w: DEVICE_WIDTH,
            h: px(300),
            radius: px(30),
            color: 0x1a1a1a,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(60),
            w: DEVICE_WIDTH,
            h: px(200),
            text: "!",
            text_size: px(80),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(200),
            w: DEVICE_WIDTH,
            h: px(70),
            text: "No stops found nearby",
            text_size: px(36),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          totalIndex += 1.7;
          deleteWidget(loading);
        }

        if (data.result === "ERROR") {
          viewContainer.createWidget(widget.FILL_RECT, {
            x: px(0),
            y: px(20),
            w: DEVICE_WIDTH,
            h: px(300),
            radius: px(30),
            color: 0x1a1a1a,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(60),
            w: DEVICE_WIDTH,
            h: px(200),
            text: "!",
            text_size: px(80),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          viewContainer.createWidget(widget.TEXT, {
            x: px(0),
            y: px(200),
            w: DEVICE_WIDTH,
            h: px(70),
            text: "Phone disconnected",
            text_size: px(36),
            color: 0xcccccc,
            align_h: align.CENTER_H,
          });
          totalIndex += 1.7;
          deleteWidget(loading);
        }

        const MESSAGE_HEIGHT = 0;

        viewContainer.createWidget(widget.TEXT, {
          x: px(30),
          y: px(0),
          w: DEVICE_WIDTH - px(60),
          h: px(MESSAGE_HEIGHT),
          text_size: px(36),
          color: 0xcccccc,
          align_h: align.LEFT,
          align_v: align.TOP,
          text: "Closest stops",
        });

        Array.from({ length: data.length }).forEach((_, index) => {
          const stop = data.result[index];

          viewContainer.createWidget(widget.BUTTON, {
            x: 0,
            y: px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH,
            h: px(PILL_HEIGHT),
            normal_color: 0x181818,
            press_color: 0x1a1a1a,
            radius: px(30),
            click_func: () => {
              push({
                url: '/pages/stop',
                params: {
                  stopId: stop.number,
                  stopLatitude: stop.position.latitude,
                  stopLongitude: stop.position.longitude,
                  stopName: stop.address,
                  stopUbica: stop.name,
                  stopDistance: stop.distance,
                  stopBikes: stop.mainStands.availabilities.bikes,
                  stopStands: stop.mainStands.capacity,
                }
              });
            }
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30),
            y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(28),
            color: 0xcccccc,
            align_h: align.RIGHT,
            align_v: align.TOP,
            text: stop.distance + "m"
          });

          viewContainer.createWidget(widget.IMG, {
            x: px(30),
            y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: px(70),
            h: px(60),
            src: stop.mainStands.availabilities.bikes < 3 ? "/bikes_red.png" : "/bikes.png"
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30 + 66),
            y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(36),
            color: stop.mainStands.availabilities.bikes < 3 ? 0xff6666 : 0xffffff, // Light red if bikes < 3, otherwise white
            align_h: align.LEFT,
            align_v: align.CENTER_V,
            text: `${stop.mainStands.availabilities.bikes}`,
          });

          viewContainer.createWidget(widget.IMG, {
            x: px(30 + 2 * 66 - (stop.mainStands.availabilities.bikes < 10 ? 20 : 0)),
            y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: px(70),
            h: px(60),
            src: stop.mainStands.capacity < 3 ? "/stands_red.png" : "/stands.png"
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30 + 3 * 66 - (stop.mainStands.availabilities.bikes < 10 ? 20 : 0)),
            y: px(20) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(36),
            color: 0xffffff,
            align_h: align.LEFT,
            align_v: align.CENTER_V,
            text: `${stop.mainStands.capacity}`,
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30),
            y: px(70) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(36),
            color: 0xffffff,
            align_h: align.LEFT,
            align_v: align.TOP,
            text: `${stop.number} | ${stop.address}`,
          });

          viewContainer.createWidget(widget.TEXT, {
            x: px(30),
            y: px(120) + px(index * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
            w: DEVICE_WIDTH - px(60),
            h: px(46),
            text_size: px(28),
            color: 0xcccccc,
            align_h: align.LEFT,
            align_v: align.BOTTOM,
            text_style: text_style.ELLIPSIS,
            text: `${stop.name}`,
          });

          totalIndex += 1;
        });

        viewContainer.createWidget(widget.BUTTON, {
          x: px(0),
          y: px(20) + px(totalIndex * (PILL_HEIGHT + 10) + MESSAGE_HEIGHT),
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
              y: px(0),
              w: DEVICE_WIDTH,
              h: DEVICE_HEIGHT,
              text: "Loading...",
              text_size: px(36),
              color: 0xcccccc,
              align_h: align.CENTER_H,
              align_v: align.CENTER_V,
            });
            deleteWidget(viewContainer);
            this.getStops();
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
