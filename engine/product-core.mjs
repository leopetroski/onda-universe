// Pure draft product calculations. No live data.
export const products = [
{id:'madeleines',name:'Mini Madeleines',variants:['Banoffee','Tiramisu','Pistachio'],pack:6},
{id:'croissant-eggs',name:'Croissant Eggs',variants:['Banoffee','Tiramisu','Pistachio','Chocolate','Mango','Berry'],pack:6},
{id:'coins',name:'ONDA Coins',variants:['Milk chocolate','White chocolate'],pack:6},
{id:'gift-box',name:'Gift Box',variants:['Banoffee','Tiramisu','Island Mango'],pack:3}
].map(p=>({...p,status:'concept',version:1}));
export function plan({units,pack,unitCost,packCost,price}) {
 if(![units,pack,unitCost,packCost,price].every(Number.isFinite)||!Number.isInteger(units)||!Number.isInteger(pack)||units<0||pack<1||Math.min(unitCost,packCost,price)<0) throw new RangeError('Invalid draft parameters');
 const boxes=Math.ceil(units/pack),cost=units*unitCost+boxes*packCost,revenue=units*price;
 return {boxes,cost,revenue,margin:revenue-cost,unusedSlots:boxes*pack-units};
}
