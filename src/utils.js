export function createPrivateStore () {
    let store = new WeakMap();

    return function (inst) {
        let obj = store.get(inst);

        if (!obj) {
            obj = {};
            store.set(inst, obj);
        };

        return obj;
    }; 
}