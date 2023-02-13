// SPDX-License-Identifier: MIT
type Constructor = new (...a: any[]) => any;
type Merge<TTrait extends Constructor, TTarget extends Constructor> = (new (
  ...a: ConstructorParameters<TTarget>
) => InstanceType<TTrait> & InstanceType<TTarget>) &
  Pick<TTarget, keyof TTarget> &
  Pick<TTrait, keyof TTrait>;

const trait =
  <TTrait extends Constructor>(_orig: TTrait) =>
  <TTarget extends Constructor>(tgt: TTarget): Merge<TTrait, TTarget> => {
    // perform patching
    return tgt as any; // assertion required
  };

class BsvScope {}

class BsvIdentifier {
  identifier: String;
}

const bsvPackageMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));
const bsvFunctionMixin = trait(BsvScope)(trait(BsvIdentifier)(class {}));

export class BsvPackage extends bsvPackageMixin {
  constructor(_id: String) {
    super();
  }
}

export class BsvFunction extends bsvFunctionMixin {
  constructor(_id: String) {
    super();
  }
}
