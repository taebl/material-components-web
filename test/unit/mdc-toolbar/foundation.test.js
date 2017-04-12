/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {assert} from 'chai';
import td from 'testdouble';

import {createMockRaf} from '../helpers/raf';
import {verifyDefaultAdapter} from '../helpers/foundation';
import {setupFoundationTest} from '../helpers/setup';
import MDCToolbarFoundation from '../../../packages/mdc-toolbar/foundation';

const {cssClasses, numbers} = MDCToolbarFoundation;

suite('MDCToolbarFoundation');

test('exports strings', () => {
  assert.isOk('strings' in MDCToolbarFoundation);
});

test('exports cssClasses', () => {
  assert.isOk('cssClasses' in MDCToolbarFoundation);
});

test('exports numbers', () => {
  assert.isOk('numbers' in MDCToolbarFoundation);
});

test('defaultAdapter returns a complete adapter implementation', () => {
  verifyDefaultAdapter(MDCToolbarFoundation, [
    'hasClass', 'addClass', 'removeClass', 'registerScrollHandler',
    'deregisterScrollHandler', 'registerResizeHandler', 'deregisterResizeHandler',
    'getViewportWidth', 'getViewportScrollY', 'getOffsetHeight',
    'getFlexibleRowElementOffsetHeight', 'notifyChange', 'setStyle',
    'setStyleForTitleElement', 'setStyleForFlexibleRowElement',
    'setStyleForFixedAdjustElement',
  ]);
});

const setupTest = () => setupFoundationTest(MDCToolbarFoundation);

test('#constructor initialized calculations_', () => {
  const {foundation} = setupTest();
  assert.isDefined(foundation.calculations_);
});

test('#init calls component event registrations', () => {
  const {foundation, mockAdapter} = setupTest();

  foundation.init();
  td.verify(mockAdapter.registerResizeHandler(td.matchers.isA(Function)));
  td.verify(mockAdapter.registerResizeHandler(td.matchers.isA(Function)));
});

test('#destroy calls component event deregistrations', () => {
  const {foundation, mockAdapter} = setupTest();

  let resizeHandler;
  let scrollHandler;
  td.when(mockAdapter.registerResizeHandler(td.matchers.isA(Function))).thenDo((handler) => {
    resizeHandler = handler;
  });
  td.when(mockAdapter.registerScrollHandler(td.matchers.isA(Function))).thenDo((handler) => {
    scrollHandler = handler;
  });

  foundation.init();
  foundation.destroy();
  td.verify(mockAdapter.deregisterResizeHandler(resizeHandler));
  td.verify(mockAdapter.deregisterScrollHandler(scrollHandler));
});

test('#getFlexibleExpansionRatio returns zero when scrollTop equals to flexibleExpansionHeight', () => {
  const {foundation} = setupTest();
  const scrollTop = 40;

  foundation.init();
  foundation.calculations_.flexibleExpansionHeight = 40;

  assert.approximately(foundation.getFlexibleExpansionRatio(scrollTop), 0, 0.0001);
});

test('#getFlexibleExpansionRatio returns 0.5 when scrollTop equals to flexibleExpansionHeight', () => {
  const {foundation} = setupTest();
  const scrollTop = 20;

  foundation.init();
  foundation.calculations_.flexibleExpansionHeight = 40;

  assert.approximately(foundation.getFlexibleExpansionRatio(scrollTop), 0.5, 0.0001);
});

test('#getFlexibleExpansionRatio returns 1 when scrollTop equals to 0', () => {
  const {foundation} = setupTest();
  const scrollTop = 0;

  foundation.init();
  foundation.calculations_.flexibleExpansionHeight = 40;

  assert.approximately(foundation.getFlexibleExpansionRatio(scrollTop), 1, 0.0001);
});

test('#getFlexibleExpansionRatio handles no flexible height case', () => {
  const {foundation} = setupTest();
  const scrollTop = 20;

  foundation.init();
  foundation.calculations_.flexibleExpansionHeight = 0;

  assert.equal(foundation.getFlexibleExpansionRatio(scrollTop), 0);
});

test('#updateAdjustElementStyles adjust marginTop for fixed toolbar', () => {
  const {foundation, mockAdapter} = setupTest();

  td.when(mockAdapter.hasClass(cssClasses.FIXED)).thenReturn(true);
  foundation.init();
  foundation.updateAdjustElementStyles();

  td.verify(mockAdapter.setStyleForFixedAdjustElement('marginTop', td.matchers.anything()));
});

test('#updateAdjustElementStyles adjust marginTop for fixed last row only toolbar', () => {
  const {foundation, mockAdapter} = setupTest();

  td.when(mockAdapter.hasClass(cssClasses.FIXED_LASTROW)).thenReturn(true);
  foundation.init();
  foundation.updateAdjustElementStyles();

  td.verify(mockAdapter.setStyleForFixedAdjustElement('marginTop', td.matchers.anything()));
});

test('#updateAdjustElementStyles do not adjust marginTop for non-fixed toolbar', () => {
  const {foundation, mockAdapter} = setupTest();

  foundation.init();
  foundation.updateAdjustElementStyles();

  td.verify(mockAdapter.setStyleForFixedAdjustElement('marginTop', td.matchers.anything()), {times: 0});
});

test('#updateToolbarStyles debounces calls within the same frame', () => {
  const {foundation} = setupTest();
  const mockRaf = createMockRaf();
  foundation.updateToolbarStyles();
  foundation.updateToolbarStyles();
  foundation.updateToolbarStyles();
  assert.equal(mockRaf.pendingFrames.length, 1);
  mockRaf.restore();
});

test('#updateToolbarStyles resets debounce latch when updateToolbarStyles frame is run', () => {
  const {foundation} = setupTest();
  const mockRaf = createMockRaf();

  foundation.updateToolbarStyles();
  mockRaf.flush();
  foundation.updateToolbarStyles();
  assert.equal(mockRaf.pendingFrames.length, 1);
  mockRaf.restore();
});

test('#updateToolbarStyles will not execute if we scrolled out of theshold and executed last change', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.scrolledOutOfTheshold_ = () => true;
  foundation.executedLastChange_ = true;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles will execute if we scrolled out but last change was not executed, then set it to true',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.scrolledOutOfTheshold_ = () => true;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  assert.equal(foundation.executedLastChange_, true);
  mockRaf.restore();
});

test('#updateToolbarStyles will execute if we have not scrolled out of theshold, keep executedLastChange_ false',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  assert.equal(foundation.executedLastChange_, false);
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for scrollable flexible header when flexible space fully expaned',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 1;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for scrollable flexible header when flexible space shrinked', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for scrollable flexible header when flexible space in transition',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0.5;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed flexible header when flexible space fully expaned', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedAllRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 1;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed flexible header when flexible space shrinked', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedAllRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed flexible header when flexible space in transition', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedAllRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0.5;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed last row flexible header when flexible space fully expaned',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedLastrow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 1;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed last row flexible header when flexible space shrinked', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedLastrow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed last row flexible header when other rows scrolled out already',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();
  const rowHeight = 64;

  td.when(mockAdapter.getViewportScrollY()).thenReturn(rowHeight * 3);

  foundation.hasFlexibleRow_ = true;
  foundation.fixedLastrow_ = true;
  foundation.calculations_.flexibleExpansionHeight = rowHeight;
  foundation.calculations_.maxTranslateYDistance = rowHeight;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.addClass(cssClasses.FIXED_AT_LAST_ROW));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for fixed last row flexible header when flexible space in transition',
  () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedLastrow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0.5;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for non-flexible scrollable header', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for non-flexible fixed header', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.fixedAllRow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for non-flexible fixed last row only header', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.fixedLastrow_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.notifyChange({flexibleExpansionRatio: td.matchers.isA(Number)}));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MAX));
  td.verify(mockAdapter.removeClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MIN));
  td.verify(mockAdapter.addClass(cssClasses.FLEXIBLE_MAX), {times: 0});
  td.verify(mockAdapter.setStyle('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForFlexibleRowElement('height', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()), {times: 0});
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for flexible scrollable header with default behavior', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.useFlexDefaultBehavior_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()), {times: 0});
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()));
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for flexible fixed last row only header with default behavior', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedLastrow_ = true;
  foundation.useFlexDefaultBehavior_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()));
  mockRaf.restore();
});

test('#updateToolbarStyles take correct action for flexible fixed header with default behavior', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  foundation.hasFlexibleRow_ = true;
  foundation.fixedAllRow_ = true;
  foundation.useFlexDefaultBehavior_ = true;
  foundation.scrolledOutOfTheshold_ = () => false;
  foundation.getFlexibleExpansionRatio = () => 0;
  foundation.updateToolbarStyles();
  mockRaf.flush();

  td.verify(mockAdapter.setStyleForTitleElement('transform', td.matchers.anything()));
  td.verify(mockAdapter.setStyleForTitleElement('fontSize', td.matchers.anything()));
  mockRaf.restore();
});

test('#setKeyHeights debounces calls within the same frame', () => {
  const {foundation} = setupTest();
  const mockRaf = createMockRaf();
  foundation.setKeyHeights();
  foundation.setKeyHeights();
  foundation.setKeyHeights();
  assert.equal(mockRaf.pendingFrames.length, 1);
  mockRaf.restore();
});

test('#setKeyHeights resets debounce latch when setKeyHeights frame is run', () => {
  const {foundation} = setupTest();
  const mockRaf = createMockRaf();

  foundation.setKeyHeights();
  // Calling mockRaf twice because #setKeyHeights also calls updateToolbarStyles
  mockRaf.flush();
  mockRaf.flush();
  foundation.setKeyHeights();
  assert.equal(mockRaf.pendingFrames.length, 1);
  mockRaf.restore();
});

test('#setKeyHeights do not call update style if screen width does not go below breakpoint', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  td.when(mockAdapter.getViewportWidth()).thenReturn(numbers.TOOLBAR_MOBILE_BREAKPOINT + 1);

  foundation.calculations_.toolbarRowHeight = numbers.TOOLBAR_ROW_HEIGHT;
  foundation.updateAdjustElementStyles = td.function();
  foundation.updateToolbarStyles = td.function();
  foundation.setKeyHeights();
  mockRaf.flush();

  td.verify(foundation.updateAdjustElementStyles(), {times: 0});
  td.verify(foundation.updateToolbarStyles(), {times: 0});
  mockRaf.restore();
});

test('#setKeyHeights call update style if screen width go below breakpoint', () => {
  const {foundation, mockAdapter} = setupTest();
  const mockRaf = createMockRaf();

  td.when(mockAdapter.getViewportWidth()).thenReturn(numbers.TOOLBAR_MOBILE_BREAKPOINT - 1);
  foundation.calculations_.toolbarRowHeight = numbers.TOOLBAR_ROW_HEIGHT;
  foundation.updateAdjustElementStyles = td.function();
  foundation.updateToolbarStyles = td.function();
  foundation.setKeyHeights();
  mockRaf.flush();

  td.verify(foundation.updateAdjustElementStyles());
  td.verify(foundation.updateToolbarStyles());
  mockRaf.restore();
});

test('#init sets correct ratio for scrollable flexible header', () => {
  const {foundation, mockAdapter} = setupTest();

  const rowHeight = numbers.TOOLBAR_ROW_HEIGHT;
  const flexibleRowMaxHeight = rowHeight * 4;
  const toolbarHeight = flexibleRowMaxHeight + rowHeight;
  td.when(mockAdapter.hasClass(cssClasses.TOOLBAR_ROW_FLEXIBLE)).thenReturn(true);
  td.when(mockAdapter.getFlexibleRowElementOffsetHeight()).thenReturn(flexibleRowMaxHeight);
  td.when(mockAdapter.getOffsetHeight()).thenReturn(toolbarHeight);

  foundation.getRowHeight_ = () => rowHeight;
  foundation.init();

  assert.equal(foundation.calculations_.toolbarRowHeight, rowHeight);
  assert.equal(foundation.calculations_.toolbarRatio, 5);
  assert.equal(foundation.calculations_.flexibleExpansionRatio, 3);
  assert.equal(foundation.calculations_.maxTranslateYRatio, 0);
  assert.equal(foundation.calculations_.scrollThesholdRatio, 3);
});

test('#init sets correct ratio for fixed flexible header', () => {
  const {foundation, mockAdapter} = setupTest();

  const rowHeight = numbers.TOOLBAR_ROW_HEIGHT;
  const flexibleRowMaxHeight = rowHeight * 4;
  const toolbarHeight = flexibleRowMaxHeight + rowHeight;
  td.when(mockAdapter.hasClass(cssClasses.FIXED)).thenReturn(true);
  td.when(mockAdapter.hasClass(cssClasses.TOOLBAR_ROW_FLEXIBLE)).thenReturn(true);
  td.when(mockAdapter.getFlexibleRowElementOffsetHeight()).thenReturn(flexibleRowMaxHeight);
  td.when(mockAdapter.getOffsetHeight()).thenReturn(toolbarHeight);

  foundation.getRowHeight_ = () => rowHeight;
  foundation.init();

  assert.equal(foundation.calculations_.toolbarRowHeight, rowHeight);
  assert.equal(foundation.calculations_.toolbarRatio, 5);
  assert.equal(foundation.calculations_.flexibleExpansionRatio, 3);
  assert.equal(foundation.calculations_.maxTranslateYRatio, 0);
  assert.equal(foundation.calculations_.scrollThesholdRatio, 3);
});

test('#init sets correct ratio and style for fixed last row flexible header', () => {
  const {foundation, mockAdapter} = setupTest();

  const rowHeight = numbers.TOOLBAR_ROW_HEIGHT;
  const flexibleRowMaxHeight = rowHeight * 4;
  const toolbarHeight = flexibleRowMaxHeight + rowHeight;
  td.when(mockAdapter.hasClass(cssClasses.FIXED_LASTROW)).thenReturn(true);
  td.when(mockAdapter.hasClass(cssClasses.TOOLBAR_ROW_FLEXIBLE)).thenReturn(true);
  td.when(mockAdapter.getFlexibleRowElementOffsetHeight()).thenReturn(flexibleRowMaxHeight);
  td.when(mockAdapter.getOffsetHeight()).thenReturn(toolbarHeight);

  foundation.getRowHeight_ = () => rowHeight;
  foundation.init();

  assert.equal(foundation.calculations_.toolbarRowHeight, rowHeight);
  assert.equal(foundation.calculations_.toolbarRatio, 5);
  assert.equal(foundation.calculations_.flexibleExpansionRatio, 3);
  assert.equal(foundation.calculations_.maxTranslateYRatio, 1);
  assert.equal(foundation.calculations_.scrollThesholdRatio, 4);
});
