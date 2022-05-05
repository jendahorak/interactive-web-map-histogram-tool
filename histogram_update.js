'use strict';

const results = document.querySelectorAll('.result_text');
const varSelection = document.getElementById('variable_choice');
const classSelection = document.getElementById('classify_selection');

const colors = {
  median_age4: ['#f1eef6', '#bdc9e1', '#74a9cf', '#0570b0'],
  median_age5: ['#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d'],
  median_age6: ['#f1eef6', '#d0d1e6', '#a6bddb', '#74a9cf', '#2b8cbe', '#045a8d'],
  median_age7: ['#f1eef6', '#d0d1e6', '#a6bddb', '#74a9cf', '#3690c0', '#0570b0', '#034e7b'],

  deaths_per_mil4: ['#feebe2', '#fbb4b9', '#f768a1', '#ae017e'],
  deaths_per_mil5: ['#feebe2', '#fbb4b9', '#f768a1', '#c51b8a', '#7a0177'],
  deaths_per_mil6: ['#feebe2', '#fcc5c0', '#fa9fb5', '#f768a1', '#c51b8a', '#7a0177'],
  deaths_per_mil7: ['#feebe2', '#fcc5c0', '#fa9fb5', '#f768a1', '#dd3497', '#ae017e', '#7a0177'],
};

// TOP LEVEL FUNCTIONS
function parseSvgElementData(svgEl, arr) {
  arr.push({
    country_name: svgEl.id,
    median_age: Number(svgEl.dataset.med_age),
    deaths_per_mil: Number(svgEl.dataset.d_per_mil),
  });
}

// update variable from selections
function updateVariable(selection) {
  let option = selection.options[selection.selectedIndex];
  return option.value;
}

function init() {
  // map runtime
  const paths = document.getElementById('australia').contentDocument.getElementsByTagName('path');
  const data = [];

  // default interactive variables
  let numofBreaks = 5;
  let chosenVar = 'median_age';
  let prevColor = undefined;

  for (let item of paths) {
    function mouseOverEffect() {
      prevColor = item.style.fill;

      item.style.fill = 'rgba(128, 128, 128, 0.3)';

      results[0].textContent = this.id;
      results[1].textContent = this.dataset.med_age;
      results[2].textContent = String(parseInt(this.dataset.d_per_mil)).replace(
        /(?<!(\.\d*|^.{0}))(?=(\d{3})+(?!\d))/g,
        ' ',
      );
    }

    function mouseOutEffect() {
      item.style.fill = prevColor;

      for (let res of results) {
        res.textContent = '';
      }
    }

    item.addEventListener('mouseover', mouseOverEffect);
    item.addEventListener('mouseout', mouseOutEffect);

    parseSvgElementData(item, data);
  }

  // =========================
  // HISTOGRAM
  // =========================

  // ==== DIMENSIONS ====
  const MARGIN = { LEFT: 50, RIGHT: 10, TOP: 10, BOTTOM: 50 };
  const WIDTH = 500 - MARGIN.LEFT - MARGIN.RIGHT;
  const HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM;

  // ====INIT SVG and G====
  // initiate the svg element
  const svg = d3
    .select('#histogram_parent')
    .append('svg')
    .attr('width', WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
    .attr('height', HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);
  // .style('border', '2px solid black');
  // init the group for margin usage
  const g = svg.append('g').attr('transform', `translate( ${MARGIN.LEFT}, ${MARGIN.TOP})`);

  // ===X LABEL===
  const xLabel = g
    .append('text')
    .attr('x', WIDTH / 2)
    .attr('y', HEIGHT + 35)
    .attr('class', 'graph-label')
    .attr('text-anchor', 'middle');

  // ===Y LABEl===
  const yLabel = g
    .append('text')
    .text('freq.')
    .attr('x', -HEIGHT / 2)
    .attr('y', -25)
    .attr('class', 'graph-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)');

  // ========================================

  // Init scales for for axies
  const x = d3.scaleLinear().range([0, WIDTH]);
  const y = d3.scaleLinear().range([HEIGHT, 0]);
  const customScale = d3.scaleLinear();

  // init bin fuction for creating buckets
  const bin1 = d3.bin();

  // AXIS DEFINITION
  const xAxisGroup = g.append('g').attr('class', 'x axis').attr('transform', `translate(0, ${HEIGHT})`);
  const yAxisGroup = g.append('g').attr('class', 'y axis');

  // ==== main function drawing graph from different types of data
  function updateChart(data) {
    let currentColor = chosenVar == 'median_age' ? '#bdc9e1' : '#fbb4b9';

    // reset colors
    for (let path of paths) {
      path.removeAttribute('style');
    }

    // ===== Functions for calculating thresholds from given data
    function clacCustomThresholds(numOfThr, numofBuckets) {
      const customStep =
        (d3.max(data, d => Math.round(d[chosenVar])) - d3.min(data, d => Math.round(d[chosenVar]))) / numofBuckets; //custom float step
      let minimalVal = Math.round(d3.min(data, d => d[chosenVar]));
      const thresholds = [];

      for (let num = 1; num <= numOfThr; num++) {
        thresholds.push(minimalVal);
        minimalVal += customStep;
      }
      return thresholds;
    }

    // REMOVE PREVIOUS STUFF -- TODO: make it a func
    const previousLines = g.selectAll('line');
    previousLines.remove();
    const previousRects = g.selectAll('rect');
    previousRects.remove();
    const previousText = g.selectAll('.label');
    previousText.remove();

    // define custom scale for calculating extent domain for bucket (bin) definition
    customScale.domain(d3.extent(data, d => Math.round(d[chosenVar])));

    // define bin function -> to be contained by extent of the data and have 10 buckets
    bin1
      .value(d => d[chosenVar])
      .domain(customScale.domain())
      .thresholds(clacCustomThresholds(10, 10));

    // classify the data into buckets
    const binnedData = bin1(data);

    // scale binned data
    x.domain([binnedData[0].x0, binnedData[binnedData.length - 1].x1]);
    y.domain([0, d3.max(binnedData, d => d.length)]);

    // define axies
    const xAxisCall = d3
      .axisBottom(x)
      .tickValues(clacCustomThresholds(11, 10)) // needed for labels to be at the end
      .tickFormat(x => x.toFixed(1).replace(/^([\d,]+)$|^([\d,]+)\.0*$|^([\d,]+\.[0-9]*?)0*$/, '$1$2$3')); //nice formatting of decimal places
    const yAxisCall = d3.axisLeft(y).ticks(6);

    // axis initiation - appendign to the svg
    xAxisGroup.transition().duration(750).call(xAxisCall);
    yAxisGroup.transition().duration(750).call(yAxisCall);

    // append axies labes
    let chosenVArAliasToDisplay = chosenVar == 'median_age' ? 'median age' : 'deaths per 1mil.';
    xLabel.text(chosenVArAliasToDisplay);

    // SELECT DATA
    const rects = g.selectAll('rect').data(binnedData);

    //   ENTER / ADD
    rects
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', HEIGHT)
      .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
      .style('fill', currentColor)
      .transition()
      .duration(750)
      .attr('x', d => x(d.x0) + 1)
      .attr('y', d => y(d.length))
      .attr('height', d => HEIGHT - y(d.length));

    // ========================
    // ======= CLASS tool =====
    // ========================
    function classifyBreaks() {
      // define scales for calculating between svg and data values
      const backScale = d3
        .scaleLinear()
        .domain([0, WIDTH])
        .range([d3.min(data, d => d[chosenVar]), d3.max(data, d => d[chosenVar])]);
      const forwardScale = d3
        .scaleLinear()
        .domain([d3.min(data, d => d[chosenVar]), d3.max(data, d => d[chosenVar])])
        .range([0, WIDTH]);

      // colors

      // stats for classification
      const std = d3.deviation(data, d => d[chosenVar]);
      const mean = d3.mean(data, d => d[chosenVar]);
      let firstThreshold = mean - (std / 2) * Math.floor(numofBreaks / 2);
      // console.log('numofbreaks:', numofBreaks, 'mean:', mean, 'std', std);

      // calculate inital line placement
      function calcStdThresholds(n) {
        let step = std / 2;
        const thresholds = [];
        for (let num = 1; num <= n; num++) {
          thresholds.push(firstThreshold);
          firstThreshold += step;
        }
        // console.log(thresholds);
        return thresholds;
      }

      // Map coloring
      function classifyMap(bucketData, chosenVar, colors) {
        // get color classes thresholds
        const mapThresholds = bucketData.map(x => backScale(x.x));
        mapThresholds.unshift(Math.floor(d3.min(data, d => d[chosenVar]))); // workaround for first interval(min -> 1. hranice)

        let svgChosenVarAlias = chosenVar == 'median_age' ? 'med_age' : 'd_per_mil';

        let cI = 0;
        for (let thr of mapThresholds) {
          for (let path of paths) {
            let variable = Number(path.dataset[svgChosenVarAlias]);
            if (variable > thr) {
              path.style.fill = colors[cI];
            }
          }
          cI++;
        }
      }
      // remove previous classification - TODO - make a func
      const previousText = g.selectAll('.label');
      previousText.remove();
      const previousLines = g.selectAll('line');
      previousLines.remove();

      // define bin func for creating line placements
      const bin3 = d3
        .bin()
        .value(d => d[chosenVar])
        .domain([firstThreshold, d3.max(data, d => d[chosenVar])])
        .thresholds(calcStdThresholds(numofBreaks));

      // classify
      const stdDataVis = bin3(data);

      // get attr with scaled to svg needed in motion control
      for (let line of stdDataVis) {
        line.x = forwardScale(line.x0);
      }

      // define lines
      const lines = g.selectAll('lines').data(stdDataVis);
      lines
        .enter()
        .append('line')
        .attr('y1', HEIGHT)
        .attr('y2', 0)
        .call(d3.drag().on('start', started).on('drag', dragged).on('end', dragend))
        .transition()
        .duration(750)
        .attr('x1', d => d.x)
        .attr('x2', d => d.x)
        .attr('class', `draggable class_line preselected-line-${chosenVar}`);

      // remove previous on reset
      const labels = g.selectAll('.labels').data(stdDataVis);
      previousText.remove();

      labels
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('id', d => `label-${stdDataVis.indexOf(d)}`)
        // .attr('class', 'label')
        .text(d =>
          backScale(d.x)
            .toFixed(1)
            .replace(/^([\d,]+)$|^([\d,]+)\.0*$|^([\d,]+\.[0-9]*?)0*$/, '$1$2$3'),
        )
        .transition()
        .duration(750)
        .attr('x', d => d.x + 5)
        .attr('y', d => HEIGHT - (HEIGHT - (stdDataVis.indexOf(d) + 2) * 15));

      // color the map
      let numOfClasses = numofBreaks + 1;
      classifyMap(stdDataVis, chosenVar, colors[`${chosenVar}${numOfClasses}`]);

      //------------ DRAG functions ------------
      function started() {}

      function dragged(event, d) {
        // movement of lines -> cannot overlap, cannot go off chart
        let currLineI = stdDataVis.indexOf(d);
        let smallerVal = currLineI == 0 ? currLineI : stdDataVis[currLineI - 1].x;
        let biggerVal = currLineI == stdDataVis.length - 1 ? WIDTH : stdDataVis[currLineI + 1].x;

        // console.log('bigger val:', biggerVal, 'smaller val:', smallerVal);

        d3.select(this)
          .raise()
          .attr('x1', Math.max(smallerVal + 2, Math.min(biggerVal - 2, event.x)))
          .attr('x2', Math.max(smallerVal + 2, Math.min(biggerVal - 2, event.x)))
          .classed(`selected-line-${chosenVar}`, true);
        d.x = this.x1.animVal.value;

        // labels is dragged with line
        const currLabel = g.select(`#label-${currLineI}`);
        currLabel
          .text(d =>
            backScale(d.x)
              .toFixed(1)
              .replace(/^([\d,]+)$|^([\d,]+)\.0*$|^([\d,]+\.[0-9]*?)0*$/, '$1$2$3'),
          )
          .attr('x', d => d.x + 5)
          .attr('y', d => HEIGHT - (HEIGHT - (stdDataVis.indexOf(d) + 2) * 15));
      }

      function dragend() {
        d3.select(this).classed(`selected-line-${chosenVar}`, false);
        classifyMap(stdDataVis, chosenVar, colors[`${chosenVar}${numOfClasses}`]);
      }
    }
    // ------------------------------------------

    // interactive number of classes selection
    classSelection.addEventListener('input', () => {
      numofBreaks = Number(updateVariable(classSelection)) - 1;
      classifyBreaks();
    });
  }

  updateChart(data);

  // interactive dataset selection
  varSelection.addEventListener('input', () => {
    chosenVar = updateVariable(varSelection);
    updateChart(data);
  });
}

window.addEventListener('load', init);
