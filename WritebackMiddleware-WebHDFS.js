var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ioclient = require('socket.io-client')('http://localhost:33333');
var socketio_port = '33333';
var WebHDFS = require('webhdfs');
var jsonfile = require('jsonfile');
var fs = require('fs'); 
var dateFormat = require('dateformat');
var ss = require('socket.io-stream');
var path = require('path');
var json2csv = require('json2csv');
const Promise = require('bluebird');
const qsocks = require('qsocks');
var filename='';
var csv = '';
var appData={};
appData.dataRows=[]
var columnLabels=[];
var finalAppData='';
var numRowsTotal=0;
var columnheaders=[];
var filename='';
var inProcess=false;

//var db = require('odbc')();

app.get('/', function(req, res){
  res.sendFile('/index.html', { root: 'C:\\' });
});

io.on('connection', function(socket){
  console.log('got a connection')
  var appname;
  var finaldataobj=[];

  socket.on('datachunk', function(data, callback) {
      //console.log('got a new chunk', JSON.stringify(data));
      finaldataobj=finaldataobj.concat(data)
      console.log('appdata.datarows.length',finaldataobj.length)
      console.log('numrowstotal',numRowsTotal)
      socket.broadcast.emit('progress',Math.ceil((finaldataobj.length/numRowsTotal)*100)+'% written to Export');

      if (finaldataobj.length===numRowsTotal) {
        console.log('appdata.datarows.length',finaldataobj.length)
        console.log('numrowstotal',numRowsTotal)
        //Create a CSV
        csv = json2csv({data: finaldataobj, fields: columnheaders})
        console.log('writefile: ',filename)
        //console.log('csv',csv)
        fs.writeFile(filename, csv, (err) => {
          if (err) throw err;
          console.log(filename+' saved Locally!');
          var localFileStream = fs.createReadStream(filename);
          //console.log(localFileStream);
          var hdfs = WebHDFS.createClient({
                user: 'cloudera', // Hadoop user
                host: '192.168.38.128', // Namenode host
                port: 50070 // Namenode port
          });

          module.exports = hdfs;
          var remoteFileStream = hdfs.createWriteStream('/tmp/webhdfs/'+filename);
          localFileStream.pipe(remoteFileStream);
          socket.broadcast.emit('progress',filename+' Saved to Hadoop')
          finaldataobj=[];
          csv='';
          appData={};
          inProcess=false;
          //connection.ws.close();
        })
      }
  });


  socket.on('bulkreqmeta', function(data, callback) {
    inProcess=true;
    socket.emit('progress','Got Request, extracting data from Qlik')
    //Get column headers to be used as first line in CSV
    // numRowsTotal=data.numRowsTotal;
    // console.log('numrowstotalFIRST: ', numRowsTotal)
    // filename=data.filename;
    // console.log('bulkreqmeta filename',filename)
    for (var i=0,  tot=data.hcdefinition.qHyperCubeDef.qDimensions.length; i < tot; i++) {
      columnheaders.push(data.hcdefinition.qHyperCubeDef.qDimensions[i].qDef.qFallbackTitle); //Get Dims into array
    }
    for (var i=0,  tot=data.hcdefinition.qHyperCubeDef.qMeasures.length; i < tot; i++) {
      columnheaders.push(data.hcdefinition.qHyperCubeDef.qMeasures[i].qDef.qFallbackTitle); //Get Measures into array
    };
    appData.columnLabels=columnheaders;

    // //console.log('pages needed',data.pages_needed);
    // var pgsTotal=data.pages_needed;
    // var batchsize=data.qHeight; //set the batch size for the rest of the operations 
    // data.hcdefinition.qHyperCubeDef.qInitialDataFetch[0].qHeight=batchsize; //set qHeight to be the batch size, comes from ext data

    // // var qsocks_config = {
    // //     host: 'localhost',
    // //     isSecure: false,
    // //     origin: 'localhost',
    // //     port: 4848,

    // // };

    // console.log(JSON.stringify(qsocks));

    // qsocks.Connect()
    // .then(function(global) {
    //     return global.openDoc(data.appid)
    // })
    // .then(function(app) {
    //     console.log('got this far (app)')
    //     var seq=0;
    //     //console.log(qTopStart,batchsize);
    //     for (var i=0,  tot=data.pages_needed; i < tot; i++) {
    //       data.hcdefinition.qHyperCubeDef.qInitialDataFetch[0].qTop=batchsize*i; //reset the properties of the hypercube data fetch for the record to start at for this page request
    //       app.createSessionObject(data.hcdefinition) // Create a Generic Session Object for the PAGE we want
    //       .then(function(cube) {
    //         for (var i=0,  tot=data.currentselections.length; i < tot; i++) {
    //           var selvalues=[];
    //           for (var x=0,  totx=data.currentselections[i].qSelectedFieldSelectionInfo.length; x < totx; x++) {
    //              selvalues.push(data.currentselections[i].qSelectedFieldSelectionInfo[x].qName)
    //           }
    //           app.getField(data.currentselections[i].qField).then(function(field) {
    //             field.selectValues(selvalues, false, false);
    //             //console.log('selvalues,',selvalues,field);
    //           }).catch(function(err) { console.log(err) });
    //         }

    //         cube.getLayout().then(function(layout) {
    //             console.log('hypercube',layout.qHyperCube)
    //             console.log('get layout happened')
    //             var newchunk=[];
    //             for (var i=0,  tot=data.currentselections.length; i < tot; i++) {
    //               var selvalues=[];
    //               for (var x=0,  totx=data.currentselections[i].qSelectedFieldSelectionInfo.length; x < totx; x++) {
    //                  selvalues.push(data.currentselections[i].qSelectedFieldSelectionInfo[x].qName)
    //               }
    //               app.getField(data.currentselections[i].qField).then(function(field) {
    //                 field.selectValues(selvalues, false, false);
    //                 console.log('selvalues,',selvalues);
    //               }).catch(function(err) { console.log(err) });
    //             }

    //             for (var d = 0; d < layout.qHyperCube.qDataPages[0].qMatrix.length; d++) {
    //               var matrixLength=layout.qHyperCube.qDataPages[0].qMatrix[d].length;
    //               //console.log('matrixLength',matrixLength)
    //               var myObj = {};
    //               for (var l = 0; l < layout.qHyperCube.qDataPages[0].qMatrix[d].length; l++) {
    //                 if (layout.qHyperCube.qDataPages[0].qMatrix[d][l].qNum!='NaN') {
    //                   myObj[appData.columnLabels[l]] = layout.qHyperCube.qDataPages[0].qMatrix[d][l].qNum;
    //                 } else {
    //                   myObj[appData.columnLabels[l]] = layout.qHyperCube.qDataPages[0].qMatrix[d][l].qText;
    //                   //myObj[appData.columnLabels[l].Label] = layout.qHyperCube.qDataPages[0].qMatrix[d][l].qNum;
    //                 }
    //               }
    //               newchunk.push(myObj)
    //               //console.log('each chunk',newchunk.length)
    //             }
              
    //           if (inProcess===true) {
    //             ioclient.emit('datachunk', newchunk)
    //           }
              
    //         }).catch(function(err) { console.log(err) });
    //       })  //function(cube) end
    //     } //wider for loop end

    // }).catch(function(err) { console.log(err) }); //function(app) end


    var qsocks=require('qsocks');

    qsocks.Connect()
    .then(function(global) {
        console.log('openedapp');
        return global.openDoc('C:\\Users\\cls\\Documents\\Qlik\\Sense\\Apps\\Aster Pharma Demo.qvf')
    })
    .then(function(app) {
        console.log('made it in app');
        app.createSessionObject(data.hcdefinition).then(model => {
          //console.log('model to get layout', model.getHyperCubeData())
          model.getLayout().then(layout => {
            console.log('got layout')
            var numberOfPages = Math.ceil( layout.qHyperCube.qSize.qcy / Math.floor(10000 / layout.qHyperCube.qSize.qcx));
            console.log('numpages',numberOfPages);
            //console.log('layout section getHyperCubeData', model.getHyperCubeData())
            //----->BEGIN WORKING
            var newchunk=[];
            for (var d = 0; d < numberOfPages; d++) {
              model.getHyperCubeData('/qHyperCubeDef', [{ 
                  qWidth: layout.qHyperCube.qSize.qcx, 
                  qHeight: Math.floor(10000 / layout.qHyperCube.qSize.qcx),
                  qLeft: 0,
                  qTop:  Math.floor(10000 / layout.qHyperCube.qSize.qcx) * d
              }]).then(function(dataitself) {
                //console.log('made into then, what is data',dataitself[0].qMatrix) //THIS WORKS
                var rows=[];
                for (var d = 0; d < dataitself[0].qMatrix.length; d++) {
                  //console.log('datadetail:',dataitself[0].qMatrix[d])
                  var row=[];
                  var matrixLength=dataitself[0].qMatrix[d].length;
                  //console.log('matrixLength',dataitself[0].qMatrix[d].length)
                  var myObj = {};
                  for (var l = 0; l < dataitself[0].qMatrix[d].length; l++) {
                    console.log('matrix[d].length inside:',dataitself[0].qMatrix[d].length)
                    myObj[appData.columnLabels[l]] = dataitself[0].qMatrix[d][l].qText;
                    //console.log('datadetail record:',dataitself[0].qMatrix[d][l].qText)
                    if (dataitself[0].qMatrix[d][l].qNum !='NaN') {
                      myObj[appData.columnLabels[l]] = dataitself[0].qMatrix[d][l].qNum;
                    } else {
                      myObj[appData.columnLabels[l]] = dataitself[0].qMatrix[d][l].qText;
                      //myObj[appData.columnLabels[l].Label] = dataitself[0].qMatrix[d][l].qNum;
                    }
                    row.push(myObj)
                    //console.log(myObj)
                  }
                  rows.push(row);
                }
                newchunk=newchunk.concat(rows)
                rows=[];
                //newchunk.push(rows)
                console.log('newchunk',newchunk)
              });
            }
            //console.log(JSON.stringify(newchunk));
            //----->END WORKING STUFF
            //----->BELOW DOESNT WORK
            // Promise.all( Array.apply(null, Array(numberOfPages)).map(d, index => {
            //   return model.getHyperCubeData('/qHyperCubeDef', [{ 
            //       qWidth: layout.qHyperCube.qSize.qcx, 
            //       qHeight: Math.floor(10000 / layout.qHyperCube.qSize.qcx),
            //       qLeft: 0,
            //       qTop:  Math.floor(10000 / layout.qHyperCube.qSize.qcx) * index
            //   }])
            // }) ) //end of Promise.all
            // .then(data => console.log(data) )
            // .then(function(dataitself) {
            //     console.log(dataitself)
            // });
              //data => console.log(data))}
            //-----> END NOT WORKING
          })
        })
    });
  }); //socket.on('bulkreqmeta') End
  
  socket.on('new appuser', function(data, callback) {
    console.log('New user connected from app:');
    console.log(data);
    socket.emit('user connected status',data);
  });

}); //io.on('connection') End

//Express Things Below:

http.listen(socketio_port, function(){
  console.log('listening on *:'+socketio_port);
});

//REST listener
app.post('/writeback', function (req, res) {
	console.log('new request')
    var body = '';
    req.on('data', function (data) {
        body += data;
        console.log(body);
        ioclient.emit('wb_payload',body);
    });
    req.on('end', function () {
        console.log('/writeback requested via POST');        
    });

    res.status(200).send("OK");
});