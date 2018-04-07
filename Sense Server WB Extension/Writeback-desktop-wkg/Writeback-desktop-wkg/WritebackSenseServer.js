define(["jquery", "./jquery-ui", "text!./css/writeback.css", "./table-fixed-header", "text!./css/qirby.css", "text!./css/bootstrap.css", "text!./css/jquery-ui.css"], function($, cssContent) {
    $("<style>").html(cssContent).appendTo("head");
    return {
        initialProperties: {
            version: 1.0,
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 10,
                    qHeight: 50
                }],
                qTable: [{
                    qTargetTableName: "Country"
                }],
                // qSocket: [{
                //     qSocketServiceUrl: "wss://WIN-KAG9MEG77E6:12345"
                // }], // Don't use socketService on Sense Desktop version
                qWebService: [{
                    qWebServiceUrl: "http://192.168.100.1:12334/WritebackSenseServer"
                }]
            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 1
                },
                measures: {
                    uses: "measures",
                    min: 0
                },
                sorting: {
                    uses: "sorting"
                },
                settings: {
                    uses: "settings",
                    items: {
                        initFetchRows: {
                            ref: "qHyperCubeDef.qInitialDataFetch.0.qHeight",
                            label: "Initial fetch rows",
                            type: "number",
                            defaultValue: 50
                        },
                        webService: {
                            ref: "qHyperCubeDef.qWebService.0.qWebServiceUrl",
                            label: "Web Service Url",
                            type: "string",
                            defaultValue: "http://192.168.100.1:12334/WritebackSenseServer"
                        },
                        // socketService: {  
                        //     ref: "qHyperCubeDef.qSocket.0.qSocketServiceUrl",
                        //     label: "Socket Service Url",
                        //     type: "string",
                        //     defaultValue: "wss://192.168.100.1:12345"
                        // },  // Don't use socketService on Sense Desktop version
                        tableName: {
                            ref: "qHyperCubeDef.qTable.0.qTargetTableName",
                            label: "Target Table Name",
                            type: "string"
                        }
                    }
                }
            }
        },
        snapshot: {
            canTakeSnapshot: true
        },
        resize: function() {

        },
        paint: function($element, layout) {
            
            var _this = this,
                self = this,
                lastrow = 0,
                morebutton = false,
                QVDataTable = {},
                _layout = layout,//,
                webServiceUrl = _layout.qHyperCube.qWebService[0].qWebServiceUrl; 
                //socketServiceUrl = _layout.qHyperCube.qSocket[0].qSocketServiceUrl; //"wss://WIN-KAG9MEG77E6:12345";
                //console.log(_layout.qHyperCube);

                var html = "<div id='notifybar' align='center' style='padding: 5px 5px 5px 5px;'></div><div border='1px'><div class='row fixed-table'><div class='table-content' border='2px'><table class='table table-striped table-fixed-header table-bordered table-responsive table-hover'><thead><tr>";
                //console.log($("#nofifybar"));
            QVDataTable.TableName = _layout.qHyperCube.qTable[0].qTargetTableName;
            //console.log(_layout);

            html += "<th width='100px'></th>"
                //render titles
            $.each(this.backendApi.getDimensionInfos(), function(key, value) {
                html += "<th>" + value.qFallbackTitle + "</th>";
            });
            $.each(this.backendApi.getMeasureInfos(), function(key, value) {
                html += "<th>" + value.qFallbackTitle + "</th>";
            });
            html += "</tr></thead><tbody id='tbody'></div></div>";

            //render data
            function submitButton_Click() {
                var resultsFromData = getResults();
                var stringJSON = JSON.stringify(resultsFromData);
                console.log(stringJSON);
                postData(webServiceUrl, stringJSON);
            }

            function getResults() {


                QVDataTable.Headers = [];

                $.each(_this.backendApi.getDimensionInfos(), function(key, value) {
                    var header = {};
                    header.Name = value.qFallbackTitle;
                    QVDataTable.Headers.push(header);
                });
                $.each(_this.backendApi.getMeasureInfos(), function(key, value) {
                    var header = {};
                    header.Name = value.qFallbackTitle;
                    QVDataTable.Headers.push(header);
                });

                var headerlength = _this.backendApi.getDimensionInfos().length + _this.backendApi.getMeasureInfos().length + 1;

                QVDataTable.Rows = [];
                var rowcount=_this.backendApi.cacheCube.cube.pages[0].qMatrix.length;
                //console.log(rowcount);

                _this.backendApi.eachDataRow(function(rownum, row) {

                    var chk = $("#chk" + rownum);
                    console.log(chk[0].checked);
                    var dataRow = {};
                    dataRow.Cells = [];
                    if (chk[0].checked === true) {
                        //console.log(row);
                        // //console.log(chk[0]);
                        var rowdata = $("#row" + rownum+" td");
                        console.log(rowdata);

                        for (var c = 1; c < headerlength ; c++) {
                            var x = c-1;

                            if (row[x].qNum === 'NaN') {
                                var typeofdata = 'string';
                            } else {
                                var typeofdata = 'numeric';
                            }

                            var datacolumn = {
                                Text: rowdata[c].innerText.replace("\n",""),
                                Data: rowdata[c].innerText.replace("\n",""),
                                DataType: typeofdata
                            };
                            dataRow.Cells.push(datacolumn);
                        }
                        QVDataTable.Rows.push(dataRow);
                    }
                });

                return QVDataTable;

            }

            function postData(webServiceUrl, obj) {
                jQuery.support.cors = true;
                $.ajax({
                    type: "POST",
                    url: webServiceUrl,
                    data: JSON.stringify(obj),
                    crossDomain: true,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(msg) {
                         console.log($("#notifybar")[0].innerText);
                         $("#notifybar")[0].innerText=msg.Message;
                         $("#notifybar")[0].style.background='#ccffcc';
                         console.log($("#notifybar").innerText);
                         //jAlert(msg.Message, 'asdf');
                    },
                    error: function(xhr, ajaxOptions, thrownError) {
                        //console.log('xhr status: '+xhr.status.toString());
                        switch (xhr.status.toString()) {
                            case "404":
                                $("#notifybar")[0].innerText='Error 404 posting the data to the webservice! Could not find webservice at Url ' + webServiceUrl;
                                $("#notifybar")[0].style.background='#FFCCCC';
                                //alert('Error 404 posting the data to the webservice!\n\nCould not find webservice at Url ' + webServiceUrl);
                                break;
                            case "0":
                                $("#notifybar")[0].innerText='Success 0! You have posted your data to ' + layout.qWebserviceUrl;
                                $("#notifybar")[0].style.background='#FFFFFF';
                                //alert('Success! You have posted your data to ' + layout.qWebserviceUrl);
                                break;
                            default:
                                $("#notifybar")[0].innerText='Error posting the data to the webservice:\n\n' + 'Error Status: ' + xhr.status + '\nError Status: ' + xhr.statusText;
                                $("#notifybar")[0].style.background='#FFCCCC';
                                //alert('Error posting the data to the webservice:\n\n' + 'Error Status: ' + xhr.status + '\nError Status: ' + xhr.statusText);
                                break;
                        }
                        //hideLoadingPanel();
                    }
                });

            }

            function isEven(n) {
                n = Number(n);
                return n === 0 || !!(n && !(n % 2));
            }

            function isOdd(n) {
                return isEven(Number(n) + 1);
            }

            this.backendApi.eachDataRow(function(rownum, row) {
                lastrow = rownum;
                if (isEven(rownum) === true) {
                    html += "<tr class='bodyrows' id='row" + rownum + "' style='background: #F0F0F0'>";
                } else {
                    html += "<tr class='bodyrows' id='row" + rownum + "' style='background: #FFFFFF'>";
                }

                html += "<td width='100px'  align='center'><input type='checkbox' id='chk" + rownum + "' class='ChkBox' data-rownum=" + rownum + " name='chkbox' value=1></td>";

                $.each(row, function(key, cell) {
                    if (cell.qIsOtherCell) {
                        cell.qText = self.backendApi.getDimensionInfos()[key].othersLabel;
                    }
                    html += "<td id='cell" + rownum + key + "' class='CellText' data-cellnum='" + rownum + key + "' data-rownum=" + rownum + "><div >" + cell.qText + "</div></td>";
                    var cellnum = $("#cell" + rownum + key);
                });
                html += '</tr>';
            });
            html += "</tbody></table>";

            //add 'more...' button
            if (this.backendApi.getRowCount() > lastrow + 1) {
                html += "<button id='more' style='width:100%'>More...</button>";
                morebutton = true;
            }

            html += "</div><div align='center'><br><button id='submitws' style='width=100%;' class='qirby-button'>Submit Checked To Webservice</button>";
            html += "<br><br><div id='statusdiv'></div></div>";

            //function to update the cell.  I put it into a function because we need to use it when removing the input box also.
            function updateCell(celltext, input, el) {
                var attribute = celltext.attr("data-rownum");
                var chkbx = $("#chk" + attribute)
                chkbx.attr('checked', 'checked');;
                //console.log(attribute)
                el.firstChild.innerText = input[0].value.replace(/(\r\n|\n|\r)/gm, "")
                input.remove();
                celltext.css('background-color', 'rgb(255,255,153)');
                celltext.append($(el.firstChild.innerText));
                var clicks = $(el).data('clicks');
                $(el).data("clicks", !clicks);
            }
          
            $element.html(html);

            $element.find(".CellText").on("qv-activate", function() {
                //attach click data to this DOM element to track on and off state of cell 
                var clicks = $(this).data('clicks');
                var cellattribute = $(this).attr("data-cellnum");
                //if the cell has text in it, store the value on the cell so we can use it later if the user doesn't change the input
              	if ($(this).text()) {
                    $(this).data("textVal", $(this).text());
                }

                var celltext = $("#cell" + cellattribute);
                var el = this;
                //if this isn't the first click....
                if (clicks) {
                    //you're getting rid of the input box, so find out what the value should be
                    var cellVal = $(this).data("textVal");

                    var cellattribute = $(this).attr("data-cellnum");
                    var input = $("#input" + cellattribute);
                  	//if the values aren't the same we need to check the box, etc.
                    if (input[0].value != cellVal) {
                        $(this).data("textVal", input[0].value);
                        updateCell(celltext, input, el);
                    } else {
                        el.firstChild.innerText = $(this).data("textVal");
                        input.remove();
                    }

                } else {
                    //there's no input box, so let's make one and attach the event
                    celltext.append("<input id='input" + cellattribute + "' value='" + el.firstChild.innerText + "'>");
                    el.firstChild.innerText = "";
                    var input = $("#input" + cellattribute)

                    input.on("keypress", function(event) {
                        if (event.keyCode == 13) {
                            updateCell(celltext, input, el);
                        }

                    });
                    input.width("98%")
                    input.select();
                    input.focus();
                }
                $(this).data("clicks", !clicks);


            });


            if (morebutton) {
                var requestPage = [{
                    qTop: lastrow + 1,
                    qLeft: 0,
                    qWidth: 10, //should be # of columns
                    qHeight: Math.min(rowcount, this.backendApi.getRowCount() - lastrow)
                }];
                $element.find("#more").on("qv-activate", function() {
                    self.backendApi.getData(requestPage).then(function(dataPages) {
                        self.paint($element, layout);
                    });
                });

            }
            $element.find("#submitws").on("qv-activate", function() {
                submitButton_Click();
            });

        }
    };
});