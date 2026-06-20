function c(n){return n.reduce((r,e)=>{const u=e.refundedQuantity||0;return r+u*(e.finalPrice||e.price)},0)}export{c};
