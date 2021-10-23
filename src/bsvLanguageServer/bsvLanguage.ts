function tuple<T extends any[]>(...args: T): T {
  return args;
}

type Constructor = new (...a: any[]) => any;
type Merge<TTrait extends Constructor, TTarget extends Constructor> = (new (
  ...a: ConstructorParameters<TTarget>
) => InstanceType<TTrait> & InstanceType<TTarget>) &
  Pick<TTarget, keyof TTarget> &
  Pick<TTrait, keyof TTrait>;

const trait =
  <TTrait extends Constructor>(Orig: TTrait) =>
  <TTarget extends Constructor>(Tgt: TTarget): Merge<TTrait, TTarget> => {
    // perform patching
    return Tgt as any; // assertion required
  };

class BsvScope {}

class BsvIdentifier {
  identifier: String;
}

const BsvPackageMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));
const BsvFunctionMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));
const BsvMethodMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));
const BsvModuleMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));

export class BsvPackage extends BsvPackageMixin {
  constructor(id: String) {
    super();
  }
}

export class BsvFunction extends BsvFunctionMixin {
  constructor(id: String) {
    super();
  }
}
