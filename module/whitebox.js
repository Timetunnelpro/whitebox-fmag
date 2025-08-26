class WbActorSheet extends ActorSheet {
const prepared = ev.currentTarget.checked;
await item.update({"system.prepared": prepared});
}


/**
* Recalculate AC from equipped armor/shield/helmet and Dex mod.
* Rule (ascending AC): baseAC + shield?1 + helmet?1 + dexMod
*/
async _recalcAC() {
const items = this.actor.items;
const armors = items.filter(i => i.type === "armor");


// Choose the best armor: highest baseAC (ascending)
let baseAC = 10;
let hasShield = false;
let hasHelmet = false;


for (const a of armors) {
baseAC = Math.max(baseAC, Number(a.system.baseAC || 10));
if (a.system.shield) hasShield = true;
if (a.system.helmet) hasHelmet = true;
}


const dexMod = Number(this.actor.system.abilities?.dex?.mod || 0);
const computed = baseAC + (hasShield ? 1 : 0) + (hasHelmet ? 1 : 0) + dexMod;


await this.actor.update({
"system.defense.ac.fromArmor": baseAC,
"system.defense.ac.shieldEquipped": hasShield,
"system.defense.ac.helmetEquipped": hasHelmet,
"system.defense.ac.value": computed
});
}
}


class WbItemSheet extends ItemSheet {
static get defaultOptions() {
return foundry.utils.mergeObject(super.defaultOptions, {
classes: ["whitebox", "sheet", "item"],
template: "systems/whitebox-fmag/templates/item-sheet.html",
width: 520,
height: 420
});
}
activateListeners(html) {
super.activateListeners(html);
html.find(".wb-attack").on("click", this._onItemAttack.bind(this));
}
async _onItemAttack(ev) {
ev.preventDefault();
const item = this.item;
if (item.type !== "weapon") return;
const actor = this.item.parent;
const atkFormula = `1d20 + ${Number(item.system.bonus||0)}`;
const roll = await (new Roll(atkFormula)).evaluate({async:true});
const ac = Number(actor?.system?.defense?.ac?.value || 10);
const hit = roll.total >= ac;
let content = `<h2>${item.name} Attack</h2><p>To Hit: ${atkFormula} = <b>${roll.total}</b> vs AC ${ac} — ${hit?"HIT":"MISS"}</p>`;
if (hit) {
const dmg = await (new Roll(item.system.damage || "1d6")).evaluate({async:true});
content += `<p>Damage: ${item.system.damage} = <b>${dmg.total}</b></p>`;
}
roll.toMessage({ speaker: ChatMessage.getSpeaker({actor}), flavor: content });
}
}


Hooks.once("init", function() {
console.log("WhiteBox FMAG | Initializing");
Actors.unregisterSheet("core", ActorSheet);
Actors.registerSheet("whitebox-fmag", WbActorSheet, { makeDefault: true });
Items.unregisterSheet("core", ItemSheet);
Items.registerSheet("whitebox-fmag", WbItemSheet, { makeDefault: true });


// Handlebars helpers
Handlebars.registerHelper("eq", (a,b) => a === b);
Handlebars.registerHelper("and", (a,b) => a && b);
Handlebars.registerHelper("toInt", (s) => parseInt(s, 10));
});


// Recompute AC when items change
Hooks.on("updateItem", (item) => {
if (item.parent && item.parent.sheet instanceof WbActorSheet) {
item.parent.sheet._recalcAC();
}
});
Hooks.on("createItem", (item) => {
if (item.parent && item.parent.sheet instanceof WbActorSheet) {
item.parent.sheet._recalcAC();
}
});
Hooks.on("deleteItem", (item) => {
if (item.parent && item.parent.sheet instanceof WbActorSheet) {
item.parent.sheet._recalcAC();
}
});
