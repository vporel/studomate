import EnvVariable from '@/simulator/compiler/environment/env-variable';
import IllegalVariableValueTypeException from '@/simulator/compiler/environment/exceptions/illegal-variable-value-type.exception';

describe('EnvVariable', () => {
  it('initializes default values depending on type', () => {
    const n = new EnvVariable('id1', 'n', 'number', 'IN');
    expect(n.getValue()).toBe(0);
    const s = new EnvVariable('id2', 's', 'string', 'IN');
    expect(s.getValue()).toBe('');
    const b = new EnvVariable('id3', 'b', 'boolean', 'IN');
    expect(b.getValue()).toBe(false);
  });

  it('accepts valid typed values and rejects invalid ones', () => {
    const v = new EnvVariable('id', 'v', 'number', 'IN');
    v.setValue(42);
    expect(v.getValue()).toBe(42);
    expect(() => v.setValue('nope' as any)).toThrow(IllegalVariableValueTypeException);
  });
});
