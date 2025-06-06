

import  NoUniformColObj  from "@/model/non-uniform-col-obj";
import store, { GlobalState, ViewChangeLineChartObj } from "@/store";
import * as d3 from 'd3';
import { Commit, ActionContext, ActionHandler } from 'vuex'
import axios from "axios";
import html2canvas from "html2canvas";
import heightRef from "../components/LeftSideDataControlPanel.vue"
import widthRef from "../components/LeftSideDataControlPanel.vue"
import { nextTick } from 'vue';
import { formatRenderDataForViewChange, formatNonPowDataForViewChange } from '../helper/format-data';
class InteractionInfo {
    type: string
    showInfo: Array<boolean>
    timeRange: Array<number>
    width: number
    level: number
    constructor(type: string) {
        this.type = type;
        this.showInfo = [];
        this.timeRange = [];
        this.width = 0;
        this.level = 0;
    }
    setShowInfo(showInfo: Array<boolean>) {
        this.showInfo = showInfo;
    }
    setRangeW(timeRange: Array<number>, width: number, level: number) {
        this.timeRange = [timeRange[0], timeRange[1]];
        this.width = width;
        this.level = level;
    }

}
let interactionStack: Array<InteractionInfo> = [];

async function get(url: string) {
    url = 'postgres' + url;
    //const loading = openLoading();
    const { data } = await axios.get(url);
    //loading.close();
    return data;
}

function sleep (time: number | undefined) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function drawViewChangeLineChart(lineChartObj: ViewChangeLineChartObj, line1:any) {

    const svgElement = document.getElementById('my_svg'); 
    if(svgElement){ 
        svgElement.remove(); 
    }
    
    let realTimeStampRange: Array<number> = [];
    let nodeIndexRange: Array<number> = []
    let rowNumber = lineChartObj.timeRange[1] - lineChartObj.timeRange[0];
    realTimeStampRange = [lineChartObj.startTime,lineChartObj.endTime];
    // realTimeStampRange = [0, rowNumber];
    nodeIndexRange = [lineChartObj.timeRange[0],lineChartObj.timeRange[1]];
    
    let isInit = false;
    let isResizing = false;
    let isRebacking = false;
    let interactiveInfo = {
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        isMouseDown: false,
        isMove: false,
    };
    const pading = { top: 20, bottom: 80, left: 70, right: 20 };
    const svg = d3.select("#content-container").append("svg");
    svg
        .attr("width", lineChartObj.width + pading.left + pading.right)
        .attr("height", lineChartObj.height + pading.top + pading.bottom)
        .attr("transform", `translate(${20},${20})`)
        .style("background-color", "#fff")
        .attr("id","my_svg"); 

    const foreignId = `foreign${lineChartObj.width + Math.random()}`;
    const foreigG = svg.append("g").attr("transfrom", `translate(${pading.left},${pading.top})`)
    let foreignObj: any = foreigG.append("foreignObject").attr("id", foreignId).attr("x", pading.left).attr("y", pading.top).attr('width', lineChartObj.width).attr('height', lineChartObj.height);
    const canvas = document.createElement("canvas");
    (canvas as any).__data__ = {}
    document.getElementById(foreignId)?.appendChild(canvas);
    canvas.width = lineChartObj.width;
    canvas.height = lineChartObj.height;
    let ctx = canvas.getContext("2d");

    const indexToTimeStampScale = d3.scaleLinear().domain([nodeIndexRange[0], nodeIndexRange[1]]).range([realTimeStampRange[0], realTimeStampRange[1]]);
    // const indexToTimeStampScale = d3.scaleLinear().domain([0, lineChartObj.dataMaxLen]).range([store.state.controlParams.startTimeStamp, store.state.controlParams.endTimeStamp]);
    const xScale: any = d3.scaleLinear().domain([0, lineChartObj.width]).range([0, lineChartObj.width]);
    // console.log("new Date(realTimeStampRange[0]:", new Date(realTimeStampRange[0]*1000));
    // let showTimeXScale: any = d3.scaleLinear().domain([0, rowNumber]).range([0, lineChartObj.width]);
    let yScale: any = d3.scaleLinear().domain([lineChartObj.minV, lineChartObj.maxV]).range([lineChartObj.height, 0]);
    let xReScale = d3.scaleLinear().domain([0, lineChartObj.width]).range([0, lineChartObj.dataMaxLen - 1]);
    let showTimeXScale: any = d3.scaleTime().domain([new Date(store.state.controlParams.startTimeStamp), new Date(store.state.controlParams.endTimeStamp)]).range([0, lineChartObj.width]);
    let showXTimeScale: any = d3.scaleTime().domain([new Date(realTimeStampRange[0]), new Date(realTimeStampRange[1])]).range([0, lineChartObj.width]);
    // let showXTimeScale: any = d3.scaleLinear().domain([0,rowNumber]).range([0, lineChartObj.width]);

    const zoomAxis = d3.axisBottom(showTimeXScale);
    // let yAxis = d3.axisLeft(yScale)
    let yAxis = d3.axisLeft<number>(yScale) // 关键修改：添加 <number> 泛型类型
        .tickFormat((d) => {
            // 添加类型断言，明确 d 是 number 类型
            const value = d as number;
            
            // 将数值转换为通用格式的字符串
            const formatted = d3.format("g")(value);
            // 检查字符串长度是否超过10位
            if (formatted.length > 9) {
            // 使用科学记数法，保留两位有效数字
            return d3.format(".2e")(value);
            } else {
            return formatted;
            }
        });

    let xAxis = d3.axisBottom(showXTimeScale)
    const timeBrushObj = d3.brushX().extent([[0, 10], [lineChartObj.width, 40]]);

    timeBrushObj.on("end", brushed);
    timeBrushObj.on("start", () => {
        console.log("start")
    })
    let startTimeBoxG = lineChartObj.timeRange[0] / lineChartObj.dataMaxLen * lineChartObj.width;
    let endTimeBoxG = lineChartObj.timeRange[1] / lineChartObj.dataMaxLen * lineChartObj.width;
    // const timeBoxG = svg.append("g").attr("transform", `translate(${pading.left},${pading.top + 50 + lineChartObj.height - 20})`).call(timeBrushObj).call(timeBrushObj.move, [startTimeBoxG, endTimeBoxG]);
    // // const timeBoxG = svg.append("g").attr("transform", `translate(${pading.left},${pading.top + 50 + lineChartObj.height - 20})`).call(timeBrushObj).call(timeBrushObj.move, [0, lineChartObj.width]);
    // let zoomAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${lineChartObj.height + pading.top + 50})`).attr("class", 'x axis').call(zoomAxis)
    // let xAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${lineChartObj.height + pading.top})`).attr("class", 'x axis').call(xAxis)
    // let yAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${pading.top})`).attr("class", 'y axis').call(yAxis);
    const timeBoxG = svg.append("g").attr("transform", `translate(${70},${70 + lineChartObj.height - 20})`).call(timeBrushObj).call(timeBrushObj.move, [startTimeBoxG, endTimeBoxG]);
    // const timeBoxG = svg.append("g").attr("transform", `translate(${pading.left},${pading.top + 50 + lineChartObj.height - 20})`).call(timeBrushObj).call(timeBrushObj.move, [0, lineChartObj.width]);
    let zoomAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${70},${lineChartObj.height + pading.top + 50})`).attr("class", 'x axis').call(zoomAxis)
    let xAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${70},${lineChartObj.height + pading.top})`).attr("class", 'x axis').call(xAxis)
    let yAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${70},${20})`).attr("class", 'y axis').call(yAxis);




    function updateCanvasWidth() {
        //@ts-ignore
        canvas.style.width = lineChartObj.width;
        console.log("进入updateCanvasWidth");
        svg
            .attr("width", lineChartObj.width + pading.left + pading.right)
            .attr("height", lineChartObj.height + pading.top + pading.bottom)
        foreignObj.attr("width", lineChartObj.width);
        xScale.domain([0, lineChartObj.width]).range([0, lineChartObj.width]);
        // showTimeXScale.domain([new Date(realTimeStampRange[0]), new Date(realTimeStampRange[1])]).range([0, lineChartObj.width]);
        showTimeXScale.domain([new Date(store.state.controlParams.startTimeStamp), new Date(store.state.controlParams.endTimeStamp)]).range([0, lineChartObj.width]);
        let zoomAxis = d3.axisBottom(showTimeXScale);
        // if(lineChartObj.timeRange[1]<=0){
        //     lineChartObj.timeRange[1] = rowNumber
        //     // lineChartObj.timeRange[1] = lineChartObj.dataMaxLen;
        // }
        // showXTimeScale = d3.scaleLinear().domain([lineChartObj.timeRange[0] , lineChartObj.timeRange[1]]).range([0, lineChartObj.width]);
        // showXTimeScale = d3.scaleTime().domain([new Date(realTimeStampRange[0]), new Date(realTimeStampRange[1])]).range([0, lineChartObj.width]);

        //showTimeXScale.range([0, lineChartObj.width]);
        if (zoomAxisG != null) {
            zoomAxisG.remove();
            zoomAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${lineChartObj.height + pading.top + 50})`).attr("class", 'x axis').call(zoomAxis)
        }
        timeBrushObj.extent([[0, 10], [lineChartObj.width, 40]]);
        timeBrushObj.on("end", brushed);
        timeBrushObj.on("start", () => {
            console.log("start, new width:", lineChartObj.width)
        })
        console.log("start, timerange:", lineChartObj.timeRange[0], lineChartObj.timeRange[1])
        const tempReScale=d3.scaleLinear().domain([0, lineChartObj.dataMaxLen - 1]).range([0,lineChartObj.width]);

        let startTimeBoxG = lineChartObj.timeRange[0] / lineChartObj.dataMaxLen * lineChartObj.width;
        let endTimeBoxG = lineChartObj.timeRange[1] / lineChartObj.dataMaxLen * lineChartObj.width;
        // const timeBoxG = svg.append("g").attr("transform", `translate(${70},${70 + lineChartObj.height - 20})`).call(timeBrushObj).call(timeBrushObj.move, [startTimeBoxG, endTimeBoxG]);
        
        timeBoxG.call(timeBrushObj).call(timeBrushObj.move, [tempReScale(lineChartObj.timeRange[0]), tempReScale(lineChartObj.timeRange[1])]);
        ctx = canvas.getContext("2d");
    }

    async function draw(nonUniformColObjs?: any, minmax?:any) {
        //await sleep(10*1000)
        
        canvas.width = lineChartObj.width;
        // yScale = d3.scaleLinear().domain([lineChartObj.data.minv, lineChartObj.data.maxv]).range([lineChartObj.height, 0]);
        if(line1[10][0]._value != 0 || line1[10][1]._value != 0){
            yScale = d3.scaleLinear().domain([line1[10][0]._value, line1[10][1]._value]).range([lineChartObj.height, 0]);
        }
        else if(minmax != null){
            yScale = d3.scaleLinear().domain([minmax[0], minmax[1]]).range([lineChartObj.height, 0]);
        }
        else{
            yScale = d3.scaleLinear().domain([lineChartObj.minV, lineChartObj.maxV]).range([lineChartObj.height, 0]);
            // yScale = d3.scaleLinear().domain([-20, 20]).range([lineChartObj.height, 0]);
        }
        // yScale = d3.scaleLinear().domain([-finalValue, finalValue]).range([lineChartObj.height, 0]);
        
        // yAxis = d3.axisLeft(yScale)
        const domain = yScale.domain();
        const rangeDiff = Math.abs(domain[1] - domain[0]);
        let yAxis = d3.axisLeft<number>(yScale) // 关键修改：添加 <number> 泛型类型
        .tickFormat((d) => {
            // 添加类型断言，明确 d 是 number 类型
            const value = d as number;
            
            if (rangeDiff < 10) {
                return d3.format(".3f")(value);
            }

            // 将数值转换为通用格式的字符串
            const formatted = d3.format("g")(value);
            // 检查字符串长度是否超过10位
            if (formatted.length > 9) {
            // 使用科学记数法，保留两位有效数字
            return d3.format(".2e")(value);
            } else {
            return d3.format("d")(value);
            }
        });

        if (yAxisG !== null && yAxisG !== undefined) {
            yAxisG.remove();
        }
        yAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${pading.top})`).attr("class", 'y axis').call(yAxis);
        // if(lineChartObj.timeRange[1] > lineChartObj.dataMaxLen){
        //     lineChartObj.timeRange[1] = lineChartObj.dataMaxLen;
        // }
        console.log("when draw, timerange:", lineChartObj.timeRange[0], lineChartObj.timeRange[1], lineChartObj.width);
        showXTimeScale = d3.scaleTime().domain([new Date(Math.floor(indexToTimeStampScale(lineChartObj.timeRange[0]))), new Date(Math.floor(indexToTimeStampScale(lineChartObj.timeRange[1])))]).range([0, lineChartObj.width]);
        // showXTimeScale = d3.scaleTime().domain([new Date(lineChartObj.startTime), new Date(lineChartObj.endTime)]).range([0, lineChartObj.width]);
        // showXTimeScale = d3.scaleTime().domain([new Date(Math.floor(indexToTimeStampScale(store.state.controlParams.startTime))), new Date(Math.floor(indexToTimeStampScale(store.state.controlParams.endTime)))]).range([0, lineChartObj.width]);

        // lineChartObj.timeRange[0] = timeRange[0];
        // lineChartObj.timeRange[1] = timeRange[1];
        // if(lineChartObj.timeRange[1]<=0){
        //     lineChartObj.timeRange[1] = rowNumber
        // }
        // showXTimeScale = d3.scaleLinear().domain([lineChartObj.timeRange[0] , lineChartObj.timeRange[1]]).range([0, lineChartObj.width]);
        xAxis = d3.axisBottom(showXTimeScale);
        if (xAxisG !== null && xAxisG !== undefined) {
            xAxisG.remove();
        }
        xAxisG = svg.append("g").attr('style', 'user-select:none').attr("transform", `translate(${pading.left},${lineChartObj.height + pading.top})`).attr("class", 'x axis').call(xAxis)

        if (foreignObj == null && nonUniformColObjs) {
            foreignObj = svg.append("foreignObject")
                .attr("id", "foreign")
                .attr('x', pading.left)
                .attr('y', pading.top)
                .attr('width', lineChartObj.width)
                .attr('height', lineChartObj.height);
            const canvas = document.createElement("canvas");
            document.getElementById("foreign")?.appendChild(canvas);
            canvas.width = lineChartObj.width;
            canvas.height = lineChartObj.height;
            ctx = canvas.getContext("2d");
        }

        nonUniformColObjs = nonUniformColObjs[0];
        if (nonUniformColObjs && ctx) {
            ctx.clearRect(0, 0, lineChartObj.width, lineChartObj.height);
            ctx.beginPath();
            ctx.strokeStyle = "gray"
            ctx.lineWidth = 2;
            // let interval = (nonUniformColObjs[0].et - nonUniformColObjs[0].st)/3;
            // for (let i = 0; i < nonUniformColObjs.length; i++) {
            //     ctx.moveTo(showXTimeScale(nonUniformColObjs[i].st), yScale(nonUniformColObjs[i].sv));
            //     ctx.lineTo(showXTimeScale(nonUniformColObjs[i].st + interval*2), yScale(nonUniformColObjs[i].min));
            //     ctx.moveTo(showXTimeScale(nonUniformColObjs[i].st + interval*2), yScale(nonUniformColObjs[i].min));
            //     ctx.lineTo(showXTimeScale(nonUniformColObjs[i].st + interval*3), yScale(nonUniformColObjs[i].max));
            //     ctx.moveTo(showXTimeScale(nonUniformColObjs[i].st + interval*3), yScale(nonUniformColObjs[i].max));
            //     ctx.lineTo(showXTimeScale(nonUniformColObjs[i].et), yScale(nonUniformColObjs[i].ev));
            //     if (i <= nonUniformColObjs.length - 2) {
            //         ctx.moveTo(showXTimeScale(nonUniformColObjs[i].et), yScale(nonUniformColObjs[i].ev));
            //         ctx.lineTo(showXTimeScale(nonUniformColObjs[i + 1].st), yScale(nonUniformColObjs[i + 1].sv));
            //     }
            // }
            let interval = (nonUniformColObjs[0].et - nonUniformColObjs[0].st)/3;
            let wholeInterval = nonUniformColObjs[0].et - nonUniformColObjs[0].st
            for (let i = 0; i < nonUniformColObjs.length; i++) {
                ctx.moveTo((nonUniformColObjs[i].st-lineChartObj.timeRange[0])/wholeInterval, yScale(nonUniformColObjs[i].sv));
                ctx.lineTo((nonUniformColObjs[i].st-lineChartObj.timeRange[0] + interval)/wholeInterval, yScale(nonUniformColObjs[i].min));
                ctx.moveTo((nonUniformColObjs[i].st-lineChartObj.timeRange[0] + interval)/wholeInterval, yScale(nonUniformColObjs[i].min));
                ctx.lineTo((nonUniformColObjs[i].st-lineChartObj.timeRange[0] + interval*2)/wholeInterval, yScale(nonUniformColObjs[i].max));
                ctx.moveTo((nonUniformColObjs[i].st-lineChartObj.timeRange[0] + interval*2)/wholeInterval, yScale(nonUniformColObjs[i].max));
                ctx.lineTo((nonUniformColObjs[i].et-lineChartObj.timeRange[0])/wholeInterval, yScale(nonUniformColObjs[i].ev));
                if (i <= nonUniformColObjs.length - 2) {
                    ctx.moveTo((nonUniformColObjs[i].et-lineChartObj.timeRange[0])/wholeInterval, yScale(nonUniformColObjs[i].ev));
                    ctx.lineTo((nonUniformColObjs[i + 1].st-lineChartObj.timeRange[0])/wholeInterval, yScale(nonUniformColObjs[i + 1].sv));
                }
            }
            ctx.stroke();
        } else {
            console.log("error")
        }        
        // savePNG(canvas);
        // savePNG(document.getElementById("content-container"));
    }

    //@ts-ignore
    async function brushed({ selection }) {
        if (!isInit) {
            isInit = true
            return;
        }
        // if (isResizing) {
        //     isRebacking = false;
        //     return;
        // }
        // if (isRebacking) {
        //     isRebacking = false;
        //     return
        // }

        // console.log("brush width:", lineChartObj.width);
        xReScale = d3.scaleLinear().domain([0, lineChartObj.width]).range([0, lineChartObj.dataMaxLen - 1]);
        const timeRange = [Math.floor(xReScale(selection[0])), Math.floor(xReScale(selection[1]))];
        console.log("brush timerange,width:", lineChartObj.timeRange[0], lineChartObj.timeRange[1], lineChartObj.width);
        

        if (timeRange[0] < 0) {
            timeRange[0] = 0;
        }
        // if (timeRange[1] > rowNumber) {
        //     timeRange[1] = rowNumber
        // }


        const interInfo = new InteractionInfo("zoom")
        lineChartObj.timeRange[0] = timeRange[0];
        lineChartObj.timeRange[1] = timeRange[1];
        interInfo.setRangeW(lineChartObj.timeRange, lineChartObj.width, lineChartObj.currentLevel);
        interactionStack.push(interInfo);

        console.log("brush....");
        console.log('brushed:',timeRange)

        // console.log('brushed:',rowNumber)
        // console.log('brushed:',line1)

        let params = line1
        let table_name = params[0];
        let columns = params[1];
        let symbol = params[2];
        let experiment = params[3];
        // let width = params[4].width
        let width = lineChartObj.width;
        let height = params[4].height
        let mode = params[6]
        let parallel = 1;
        let errorBound = params[5]._value;
        let startTime = timeRange[0];
        let endTime = timeRange[1];
        let interact_type = ''
        let aggregate = params[7]
    
        if(symbol == '+'){
            symbol='plus'
        }else if(symbol == '-'){
            symbol='minus'
        }else if(symbol == '*'){
            symbol='multi'
        }else if(symbol == '/'){
            symbol='divide'
        }
    
        console.log(table_name,experiment,columns,symbol,'',width,height,mode,parallel,errorBound,startTime,endTime, interact_type, aggregate)
        let combinedUrl = `/line_chart/start?table_name=${table_name}&columns=${columns}&symbol=${symbol}&mode=${mode}&width=${width}&height=${height}&startTime=${startTime}&endTime=${endTime}&interact_type=${interact_type}&experiment=${experiment}&parallel=${parallel}&errorBound=${errorBound}&aggregate=${aggregate}`;

        store.state.controlParams.startTime = startTime;
        store.state.controlParams.endTime = endTime;
        const showColumns = await get(combinedUrl);
        console.log("showColumns['M4_arrays']:", showColumns['M4_arrays']);
        let min = showColumns['min_values'][0];
        let max = showColumns['max_values'][0];
        draw(showColumns['M4_arrays'],[min,max]);
    }

    async function resizeW(width: number) {
        isResizing = true;
        // const currentLevel = lineChartObj.currentLevel;

        lineChartObj.width = width;
        updateCanvasWidth();

        //@ts-ignore
        canvas.style.width = lineChartObj.width;
        console.log("resize....");
        console.log(width);

        let params = line1
        let table_name = params[0];
        let columns = params[1];
        let symbol = params[2];
        let experiment = params[3];
        //let width = params[4].width
        let height = params[4].height
        let mode = params[6]
        let parallel = 1;
        let errorBound = params[5]._value;
        //要修改
        let startTime = 0;
        let endTime = -1;
        let interact_type = ''
        let aggregate = params[7]
    
        if(symbol == '+'){
            symbol='plus'
        }else if(symbol == '-'){
            symbol='minus'
        }else if(symbol == '*'){
            symbol='multi'
        }else if(symbol == '/'){
            symbol='divide'
        }
    
        // console.log(table_name,experiment,columns,symbol,'',width,height,mode,parallel,errorBound,startTime,endTime, interact_type, aggregate)
        // let combinedUrl = `/line_chart/start?table_name=${table_name}&columns=${columns}&symbol=${symbol}&mode=${mode}&width=${width}&height=${height}&startTime=${startTime}&endTime=${endTime}&interact_type=${interact_type}&experiment=${experiment}&parallel=${parallel}&errorBound=${errorBound}&aggregate=${aggregate}`;
    
        // const showColumns = await get(combinedUrl);
        // let min = showColumns['min_values'][0];
        // let max = showColumns['max_values'][0];
        // draw(showColumns['M4_arrays'],[min,max]);
    }
    let isMouseover = false;
    let startOffsetX = 0;
    const dragRect = svg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", lineChartObj.height + pading.top + pading.bottom)
        .attr("width", lineChartObj.width + pading.left + pading.right)
        .attr("stroke", "black")
        .attr("stroke-width", 4)
        .attr("fill", "none")
        .on("mouseover", () => {
            document.body.style.cursor = 'ew-resize';
            isMouseover = true;
        })
        .on("mousedown", (e) => {
            if (isMouseover) {
                startOffsetX = e.offsetX;
                interactiveInfo.isMouseDown = true;
            }
        })
        .on("mouseup", () => {
            console.log()
        })
        .on("mousemove", (e) => {
            if (interactiveInfo.isMouseDown) {
                console.log("33333");
                let newWidth = lineChartObj.width + pading.right + pading.left + (e.offsetX - startOffsetX);
                svg.attr("width", newWidth);
                dragRect.attr("width", newWidth);
            }
        })
        .on("mouseleave", () => {
            if (!interactiveInfo.isMouseDown) {
                document.body.style.cursor = 'default';
            }
        })

    document
        .getElementById("content-container")!
        .addEventListener("mousemove", (e) => {
            if (interactiveInfo.isMouseDown) {
                console.log("11111");
                // svg.select(".x.axis").attr("transform", `translate(${pading.left}, ${lineChartObj.height + pading.top})`);
                document.dispatchEvent(new Event("mouseup"));
                let newWidth = lineChartObj.width + pading.right + pading.left + (e.offsetX - startOffsetX);
                svg.attr("width", newWidth);
                // svg.attr("width", newWidth+10);
                dragRect.attr("width", newWidth);
            }
        });

    document
        .getElementById("content-container")!
        .addEventListener("mouseup", (e) => {
            if (interactiveInfo.isMouseDown) {
                console.log("22222");
                interactiveInfo.isMouseDown = false;
                isMouseover = false;
                document.body.style.cursor = 'default';

                // const finalWidth = parseFloat(svg.attr("width"));
                // dragRect.attr("width", finalWidth);

                let preWidth = lineChartObj.width;
                lineChartObj.width = lineChartObj.width + (e.offsetX - startOffsetX);
                dragRect.attr("width", lineChartObj.width+pading.left+pading.right);
                // lineChartObj.width = finalWidth;
                if (lineChartObj.width === preWidth) {
                    return
                }
                // const interInfo = new InteractionInfo("resize")
                // interInfo.setRangeW(lineChartObj.timeRange, lineChartObj.width, lineChartObj.currentLevel);
                // interactionStack.push(interInfo);
                resizeW(lineChartObj.width)

                let newWidth = lineChartObj.width;
                const widthInput = document.getElementById("displayWidth") as HTMLInputElement;
                // if (widthInput) {
                    // const newWidth = widthInput.value;
                    widthInput.value = newWidth.toString();
                    widthRef.value = newWidth;
                // }
                store.state.controlParams.finalWidth = newWidth;

                const event = new Event('change');
                document.getElementById("displayWidth")!.dispatchEvent(event);
            }
        });

        document.getElementById("displayWidth")!
            .addEventListener("change", (e) => {
                const widthInput = document.getElementById("displayWidth") as HTMLInputElement;
                const newWidth = widthInput.value;
                console.log("newWidth is:", newWidth);
                
                widthInput.value = newWidth.toString();
                widthRef.value = newWidth;
                console.log("768");
                // 更新 lineChartObj.width，防止被默认值覆盖
                // lineChartObj.width = newWidth;

                // 仅调整 SVG 大小，不重新创建
                // d3.select("svg").attr("width", newWidth);
        });

    
        const updateRectWidth = () => {
            const svgWidth = parseFloat(svg.attr("width"));
            dragRect.attr("width", Math.min(svgWidth, parseFloat(dragRect.attr("width")))); 
        };
        document.getElementById("content-container")!.addEventListener("mousemove", updateRectWidth);
        

    return draw
}

function computeMinMax(columInfo: Array<NoUniformColObj>) {
    let min = Infinity;
    let max = -Infinity;

    for (let j = 0; j < columInfo.length; j++) {
        if (columInfo[j].vRange[0] < min) {
            min = columInfo[j].vRange[0];
        }

        if (columInfo[j].vRange[1] > max) {
            max = columInfo[j].vRange[1];
        }

    }

    return {
        min,
        max
    }
}

// function savePNG(canvas: any) {
//     const imgURL = canvas.toDataURL("./image/png");
//     const dlLink = document.createElement("a")
//     dlLink.download = `1b_zoom_init`
//     dlLink.href = imgURL
//     dlLink.dataset.downloadurl = ["./image/png", dlLink.download, dlLink.href].join(":")
//     document.body.appendChild(dlLink)
//     dlLink.click()
//     document.body.removeChild(dlLink)
// }

function savePNG(domElement:any) {
    html2canvas(domElement).then((canvas:any) => {
        const imgURL = canvas.toDataURL("image/png");
        const dlLink = document.createElement("a");
        dlLink.download = `1b_zoom_init.png`;
        dlLink.href = imgURL;
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    });
}