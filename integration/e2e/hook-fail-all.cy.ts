before('Global Setup', () => {
  console.log('Setup');
  cy.allure({ task: 'step', arg: { name: 'global setup' } });
  throw new Error('Failed Before ALL');
});

after('Global teardown', () => {
  cy.allure({ task: 'step', arg: { name: 'global teardown' } });
  console.log('Setup');
});

describe('hooks test - failed global hook', () => {
  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

  describe('more tests', () => {
    it('test 3', () => {
      cy.log('test 2');
    });
  });
  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
});
