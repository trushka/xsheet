import { stringAt } from '../core/alphabet';
import { getFontSizePxByPt } from '../core/font';
import _cell from '../core/cell';
import { formulam } from '../core/formula';
import { formatm } from '../core/format';

import {
  Draw, DrawBox, thinLineWidth, npx,
} from '../canvas/draw';
// gobal var
const cellPaddingWidth = 5;
const tableFixedHeaderCleanStyle = { fillStyle: '#f4f5f8' };
const tableGridStyle = {
  fillStyle: '#fff',
  lineWidth: thinLineWidth(),
  strokeStyle: '#e6e6e6',
};
function tableFixedHeaderStyle() {
  return {
    textAlign: 'center',
    textBaseline: 'middle',
    font: `500 ${npx(12)}px Source Sans Pro`,
    fillStyle: '#585757',
    lineWidth: thinLineWidth(),
    strokeStyle: '#e6e6e6',
  };
}

function getDrawBox(data, rindex, cindex, yoffset = 0) {
  const {
    left, top, width, height,
  } = data.cellRect(rindex, cindex);
  return new DrawBox(left, top + yoffset, width, height, cellPaddingWidth);
}
/*
function renderCellBorders(bboxes, translateFunc) {
  const { draw } = this;
  if (bboxes) {
    const rset = new Set();
    // console.log('bboxes:', bboxes);
    bboxes.forEach(({ ri, ci, box }) => {
      if (!rset.has(ri)) {
        rset.add(ri);
        translateFunc(ri);
      }
      draw.strokeBorders(box);
    });
  }
}
*/

export function renderCell(draw, data, rindex, cindex, yoffset = 0) {
  const { sortedRowMap, rows, cols } = data;
  if (rows.isHide(rindex) || cols.isHide(cindex)) return;
  let nrindex = rindex;
  if (sortedRowMap.has(rindex)) {
    nrindex = sortedRowMap.get(rindex);
  }

  const cell = data.getCell(nrindex, cindex);
  if (cell === null) return;
  let frozen = false;
  if ('editable' in cell && cell.editable === false) {
    frozen = true;
  }

  const style = data.getCellStyleOrDefault(nrindex, cindex);
  const dbox = getDrawBox(data, rindex, cindex, yoffset);
  dbox.bgcolor = style.bgcolor;
  if (style.border !== undefined) {
    dbox.setBorders(style.border);
    // bboxes.push({ ri: rindex, ci: cindex, box: dbox });
    draw.strokeBorders(dbox);
  }
  draw.rect(dbox, () => {
    // render text
    let cellText = '';
    if (!data.settings.evalPaused) {
      cellText = _cell.render(cell.text || '', formulam, (y, x) => (data.getCellTextOrDefault(x, y)));
    } else {
      cellText = cell.text || '';
    }
    if (style.format) {
      // console.log(data.formatm, '>>', cell.format);
      cellText = formatm[style.format].render(cellText);
    }
    const font = Object.assign({}, style.font);
    font.size = getFontSizePxByPt(font.size);
    // console.log('style:', style);
    draw.text(cellText, dbox, {
      align: style.align,
      valign: style.valign,
      font,
      color: style.color,
      strike: style.strike,
      underline: style.underline,
    }, style.textwrap);
    // error
    const error = data.validations.getError(rindex, cindex);
    if (error) {
      // console.log('error:', rindex, cindex, error);
      draw.error(dbox);
    }
    if (frozen) {
      draw.frozen(dbox);
    }
    if (cell.changed) {
      draw.changed(dbox);

    }
  });
}

function renderAutofilter(viewRange) {
  const { data, draw } = this;
  if (viewRange) {
    const { autoFilter } = data;
    if (!autoFilter.active()) return;
    const afRange = autoFilter.hrange();
    if (viewRange.intersects(afRange)) {
      afRange.each((ri, ci) => {
        const dbox = getDrawBox(data, ri, ci);
        draw.dropdown(dbox);
      });
    }
  }
}

function renderContent(viewRange, fw, fh, tx, ty, dx, dy) {
  const { draw, data } = this,
    {w, h} = viewRange;
  draw.save();
  draw
    .translate(fw, fh)
    .clipRect(tx, ty, w, h)
    .translate(dx, dy);

  const { exceptRowSet } = data;
  // const exceptRows = Array.from(exceptRowSet);
  const filteredTranslateFunc = (ri) => {
    const ret = exceptRowSet.has(ri);
    if (ret) {
      const height = data.rows.getHeight(ri);
      draw.translate(0, -height);
    }
    return !ret;
  };

  const exceptRowTotalHeight = data.exceptRowTotalHeight(viewRange.sri, viewRange.eri);
  // 1 render cell
  draw.save();
  draw.translate(0, -exceptRowTotalHeight);
  viewRange.each((ri, ci) => {
    renderCell(draw, data, ri, ci);
  }, ri => filteredTranslateFunc(ri));
  draw.restore();


  // 2 render mergeCell
  const rset = new Set();
  draw.save();
  draw.translate(0, -exceptRowTotalHeight);
  data.eachMergesInView(viewRange, ({ sri, sci, eri }) => {
    if (!exceptRowSet.has(sri)) {
      renderCell(draw, data, sri, sci);
    } else if (!rset.has(sri)) {
      rset.add(sri);
      const height = data.rows.sumHeight(sri, eri + 1);
      draw.translate(0, -height);
    }
  });
  draw.restore();

  // 3 render autofilter
  renderAutofilter.call(this, viewRange);

  draw.restore();
}

function renderSelectedHeaderCell(x, y, w, h) {
  const { draw } = this;
  draw.save();
  draw.attr({ fillStyle: 'rgba(75, 137, 255, 0.08)' })
    .fillRect(x, y, w, h);
  draw.restore();
}

// viewRange
// type: all | left | top
// w: the fixed width of header
// h: the fixed height of header
// tx: moving distance on x-axis
// ty: moving distance on y-axis

function renderFixedLeftTopCell(fw, fh) {
  const { draw } = this;
  draw.save()
    .ctx.globalCompositeOperation = 'destination-over';
  // left-top-cell
  draw.attr({ fillStyle: '#f4f5f8' })
    .fillRect(0, 0, fw, fh);
  draw.restore();
}

function renderContentGrid({
  sri, sci, eri, eci, w, h,
}, fw, fh, tx, ty, dx, dy) {
  const { draw, data } = this,
    { settings, contSize } = data,
    {width, height} = contSize,
    sr = data.selector.range,
    nty = ty + fh,
    ntx = tx + fw;

  draw.save();
  // draw rect background
  draw.attr(tableFixedHeaderCleanStyle);
  draw.fillRect(0, fh, fw, h);
  draw.fillRect(fw, 0, w, fh);

  //if (!settings.showGrid) return;

  draw.attr(tableFixedHeaderStyle())
    .clipRect(0, 0, fw + width, fh + height)
    .save().translate(0, fh)

  data.rowEach(0, eri, (i, y, ch) => {

    if (i == data.freeze[0]) draw
     .line([0, y], [w, y])
     .clipRect(0, y, w, h);

    if (i >= sri) y += dy;
    else if (i >= data.freeze[0]) return;

    if (sr.sri <= i && i <= sr.eri) {
      renderSelectedHeaderCell.call(this, 0, y, fw, ch);
    }
    draw.fillText(i + 1, fw / 2, y + (ch / 2));
    if (i > 0 && data.rows.isHide(i - 1)) {
      draw.save();
      draw.attr({ strokeStyle: '#c6c6c6' });
      draw.line([5, y + 5], [fw - 5, y + 5]);
      draw.restore();
    }
    draw.line([0, y], [w, y]);
    if (i === eri) draw.line([0, y + ch], [w, y + ch]);
  });

  draw.restore().translate(fw, 0);

  data.colEach(0, eci, (i, x, cw) => {
    if (i == data.freeze[1]) draw
     .line([x, 0], [x, h])
     .clipRect(x, 0, w, h);

    if (i >= sci) x += dx;
    else if (i >= data.freeze[1]) return;

    if (sr.sci <= i && i <= sr.eci) {
      renderSelectedHeaderCell.call(this, x, 0, cw, fh);
    }
    draw.fillText(i + 1, x + (cw / 2), fh / 2);
    if (i > 0 && data.cols.isHide(i - 1)) {
      draw.save();
      draw.attr({ strokeStyle: '#c6c6c6' });
      draw.line([x + 5, 5], [x + 5, fh - 5]);
      draw.restore();
    }
    draw.line([x, 0], [x, h - dy]);
    if (i === eci) draw.line([x + cw, 0], [x + cw, h]);
  });
  draw.restore();
}

function renderFreezeHighlightLine(fw, fh, ftw, fth) {
  const { draw, data } = this;
  const twidth = data.viewWidth() - fw;
  const theight = data.viewHeight() - fh;
  draw.save()
    .translate(fw, fh)
    .attr({ strokeStyle: 'rgba(75, 137, 255, .6)' });
  draw.line([0, fth], [twidth, fth]);
  draw.line([ftw, 0], [ftw, theight]);
  draw.restore();
}

/** end */
class Table {
  constructor(el, data) {
    this.el = el;
    this.draw = new Draw(el, data.viewWidth(), data.viewHeight());
    this.data = data;
  }

  resetData(data) {
    this.data = data;
    this.render();
  }

  render() {
    // resize canvas
    const { data } = this;
    const { rows, cols } = data;
    // fixed width of header
    const fw = cols.indexWidth;
    // fixed height of header
    const fh = rows.height;

    this.draw.resize(data.viewWidth(), data.viewHeight());
    this.clear();

    const viewRange = data.viewRange();
    viewRange.sri--;
    viewRange.sci--;
    // renderAll.call(this, viewRange, data.scroll);
    const tx = data.freezeTotalWidth();
    const ty = data.freezeTotalHeight();
    const { x, y } = data.scroll;
    // 1
    renderContentGrid.call(this, viewRange, fw, fh, tx, ty, -x, -y);
    renderContent.call(this, viewRange, fw, fh, tx, ty, -x, -y);
    renderFixedLeftTopCell.call(this, fw, fh);
    const [fri, fci] = data.freeze;
    //return;
    if (fri > 0 || fci > 0) {
      // 2
      if (fri > 0) {
        const vr = viewRange.clone();
        vr.sri = 0;
        vr.eri = fri - 1;
        vr.h = ty;
        renderContent.call(this, vr, fw, fh, tx, 0, -x, 0);
      }
      // 3
      if (fci > 0) {
        const vr = viewRange.clone();
        vr.sci = 0;
        vr.eci = fci - 1;
        vr.w = tx;
        renderContent.call(this, vr, fw, fh, 0, ty, 0, -y);
      }
      // 4
      const freezeViewRange = data.freezeViewRange();
      renderContent.call(this, freezeViewRange, fw, fh, 0, 0, 0, 0);
      // 5
      renderFreezeHighlightLine.call(this, fw, fh, tx, ty);
    }
  }

  clear() {
    this.draw.clear();
  }
}

export default Table;
