window.biWebSock = (function () {
    var dataStruct = [{
        name: "Header Length",
        key: "headerLen",
        bytes: 2,
        offset: 4,
        value: 16
    }, {
        name: "Protocol Version",
        key: "ver",
        bytes: 2,
        offset: 6,
        value: 1
    }, {
        name: "Operation",
        key: "op",
        bytes: 4,
        offset: 8,
        value: 1
    }, {
        name: "Sequence Id",
        key: "seq",
        bytes: 4,
        offset: 12,
        value: 1
    }]

    var protocol = location.origin.match(/^(.+):\/\//)[1]

    var Ajax = {
        get: function (url, fn) {
            // XMLHttpRequest对象用于在后台与服务器交换数据   
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                // readyState == 4说明请求已完成
                if (xhr.readyState == 4 && xhr.status == 200 || xhr.status == 304) {
                    // 从服务器获得数据 
                    fn.call(this, xhr.responseText);
                }
            };
            xhr.send();
        },
        // datat应为'a=a1&b=b1'这种字符串格式，在jq里如果data为对象会自动将对象转成这种字符串格式
        post: function (url, data, fn) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            // 添加http头，发送信息至服务器时内容编码类型
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 304)) {
                    fn.call(this, xhr.responseText);
                }
            };
            xhr.send(data);
        }
    }

    function loadXML(xmlString) {
        var xmlDoc = null;
        //判断浏览器的类型
        //支持IE浏览器
        if (!window.DOMParser && window.ActiveXObject) { //window.DOMParser 判断是否是非ie浏览器
            var xmlDomVersions = ['MSXML.2.DOMDocument.6.0', 'MSXML.2.DOMDocument.3.0', 'Microsoft.XMLDOM'];
            for (var i = 0; i < xmlDomVersions.length; i++) {
                try {
                    xmlDoc = new ActiveXObject(xmlDomVersions[i]);
                    xmlDoc.async = false;
                    xmlDoc.loadXML(xmlString); //loadXML方法载入xml字符串
                    break;
                } catch (e) {}
            }
        }
        //支持Mozilla浏览器
        else if (window.DOMParser && document.implementation && document.implementation.createDocument) {
            try {
                /* DOMParser 对象解析 XML 文本并返回一个 XML Document 对象。
                 * 要使用 DOMParser，使用不带参数的构造函数来实例化它，然后调用其 parseFromString() 方法
                 * parseFromString(text, contentType) 参数text:要解析的 XML 标记 参数contentType文本的内容类型
                 * 可能是 "text/xml" 、"application/xml" 或 "application/xhtml+xml" 中的一个。注意，不支持 "text/html"。
                 */
                domParser = new DOMParser();
                xmlDoc = domParser.parseFromString(xmlString, 'text/xml');
            } catch (e) {}
        } else {
            return null;
        }
        return xmlDoc;
    }

    function str2bytes(str) {
        var bytes = new Array()
        var len, c
        len = str.length
        for (var i = 0; i < len; i++) {
            c = str.charCodeAt(i)
            if (c >= 0x010000 && c <= 0x10FFFF) {
                bytes.push(((c >> 18) & 0x07) | 0xF0)
                bytes.push(((c >> 12) & 0x3F) | 0x80)
                bytes.push(((c >> 6) & 0x3F) | 0x80)
                bytes.push((c & 0x3F) | 0x80)
            } else if (c >= 0x000800 && c <= 0x00FFFF) {
                bytes.push(((c >> 12) & 0x0F) | 0xE0)
                bytes.push(((c >> 6) & 0x3F) | 0x80)
                bytes.push((c & 0x3F) | 0x80)
            } else if (c >= 0x000080 && c <= 0x0007FF) {
                bytes.push(((c >> 6) & 0x1F) | 0xC0)
                bytes.push((c & 0x3F) | 0x80)
            } else {
                bytes.push(c & 0xFF)
            }
        }
        return bytes
    }

    function bytes2str(array) {
        var __array = array.slice(0)
        var j
        var filterArray = [
            [0x7f],
            [0x1f, 0x3f],
            [0x0f, 0x3f, 0x3f],
            [0x07, 0x3f, 0x3f, 0x3f]
        ]
        var str = ''
        for (var i = 0; i < __array.length; i = i + j) {
            var item = __array[i]
            var number = ''
            if (item >= 240) {
                j = 4
            } else if (item >= 224) {
                j = 3
            } else if (item >= 192) {
                j = 2
            } else if (item < 128) {
                j = 1
            }
            var filter = filterArray[j - 1]
            for (var k = 0; k < j; k++) {
                var r = (__array[i + k] & filter[k]).toString(2)
                var l = r.length
                if (l > 6) {
                    number = r
                    break
                }
                for (var n = 0; n < 6 - l; n++) {
                    r = '0' + r
                }
                number = number + r
            }
            str = str + String.fromCharCode(parseInt(number, 2))
        }
        return str
    }

    function getPacket(payload) {
        return str2bytes(payload)
    }

    function generatePacket(action, payload) {
        action = action || 2 // 2心跳  或  7加入房间
        payload = payload || ''
        var packet = getPacket(payload)
        var buff = new ArrayBuffer(packet.length + 16)
        var dataBuf = new DataView(buff)
        dataBuf.setUint32(0, packet.length + 16)
        dataBuf.setUint16(4, 16)
        dataBuf.setUint16(6, 1)
        dataBuf.setUint32(8, action)
        dataBuf.setUint32(12, 1)
        for (var i = 0; i < packet.length; i++) {
            dataBuf.setUint8(16 + i, packet[i])
        }
        return dataBuf
    }

    function Room() {
        this.timer = null
        this.socket = null
        this.roomid = null
    }

    Room.prototype = {
        getServer: function (callback) {
            var self = this;
            Ajax.get("getUrl.php?roomid=" + self.roomid,
                (res) => {
                    if (res == "") {
                        return;
                    } else {
                        var data = JSON.parse(res);
                        self.roomid = data.realId;
                        callback(data.wsaddress);
                    }

                });


        },
        sendBeat: function () {
            var self = this
            self.timer = setInterval(function () {
                self.socket.send(generatePacket())
            }, 3000)
        },
        destroy: function () {
            clearTimeout(this.timer)
            this.socket.close()
            this.socket = null
            this.timer = null
            this.roomid = null
        },
        joinRoom: function (rid, uid) {
            rid = rid || 282712
            uid = uid || 19176530
            var packet = JSON.stringify({
                uid: uid,
                roomid: rid
            })
            return generatePacket(7, packet)
        },
        init: async function (roomid = 249500) {
            var self = this;
            var socket = null;
            self.roomid = roomid;
            self.getServer((url) => {
                socket = new WebSocket(url);
                socket.binaryType = 'arraybuffer';
                socket.onopen = function (event) {
                    var join = self.joinRoom(self.roomid)
                    socket.send(join.buffer)
                    self.sendBeat(socket)
                };

                socket.onmessage = function (event) {
                    var dataView = new DataView(event.data)
                    var data = {}
                    for (var doffset = 0; doffset < dataView.byteLength;) {

                        data.packetLen = dataView.getUint32(doffset);
                        dataStruct.forEach(function (item) {
                            if (item.bytes === 4) {
                                data[item.key] = dataView.getUint32(item.offset + doffset)
                            } else if (item.bytes === 2) {
                                data[item.key] = dataView.getUint16(item.offset + doffset)
                            }
                        })
                        if (data.op && data.op === 5) {
                            data.body = []
                            var recData = []
                            for (var i = data.headerLen; i < data.packetLen; i++) {
                                recData.push(dataView.getUint8(doffset+i))
                            }
                            try {
                                // console.log(bytes2str(recData))
                                let body = JSON.parse(bytes2str(recData))
                                if (body.cmd === 'DANMU_MSG') {
                                    console.log(body.info[2][1], ':', body.info[1])
                                    self.fn.call(null, {
                                        name: body.info[2][1],
                                        text: body.info[1]
                                    })
                                }
                                data.body.push(body)
                            } catch (e) {
                                // console.log('tcp 校验失败，重新发送')
                            }

                        }
                        doffset+= data.packetLen;
                    }
                }

                socket.onclose = function () {
                    if (this.roomid) {
                        console.log('关闭直播间:' + this.roomid)
                    }
                }

                self.socket = socket
            })

        },

        then: function (fn) {
            this.fn = fn
        }
    }

    return {
        room: null,
        start: function (roomid) {
            console.log('正在进入房间：' + roomid + '...')
            this.room = new Room()
            this.room.init(roomid)
            return this.room
        },
        disconnect: function () {
            if (this.room) {
                console.log('正在退出房间：' + this.room.roomid + '...')
                this.room.destroy()
                this.room = null
            }
        }
    }
})()