import Modal from './modal';
import FormInput from './form_input';
import FormSelect from './form_select';
import FormField from './form_field';
import Button from './button';
import { t } from '../locale/locale';
import { h } from './element';
import { cssPrefix } from '../config';

const fieldLabelWidth = 100;

export default class ModalJumpTo extends Modal {
  constructor() {
    const ff = new FormField(
      new FormInput('70px', '10'),
      { required: true },
    );

    super("Jump to row", [
      h('div', `${cssPrefix}-form-fields`).children(
        ff.el
      ),
      h('div', `${cssPrefix}-buttons`).children(
        new Button('ok', 'primary').on('click', () => this.btnClick('ok')),
      ),
    ], fieldLabelWidth);
    this.ff = ff;
    this.change = () => {};
  }

  btnClick(action) {
    if (action === 'ok') {
      this.change(this.ff.val());
      this.hide();
  }
  }

  showTo() {
      this.show();
  }
}
