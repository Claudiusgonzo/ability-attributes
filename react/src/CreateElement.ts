/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DevEnv, isAccessibleElement } from 'ability-attributes';
import { createElement as reactCreateElement } from 'react';

import { Accessibility } from './ReactProp';

let _enforceClasses = true;
let _enforceRoleNone = true;
let _showRenderErrors = true;
const _origCreateElement = reactCreateElement;

export interface Settings {
    enforceClasses?: boolean; // true by default.
    enforceRoleNone?: boolean; // true by default.
    showRenderErrors?: boolean; // true by default.
}

const createElement: typeof reactCreateElement = function createElement(this: any, type: any, props?: any): any {
    if (typeof type === 'string') {
        if (props && (props as any).$accessibility) {
            let { $accessibility, ...modifiedProps }: { $accessibility: Accessibility<any>, [key: string]: any } = props as any;

            if ($accessibility instanceof Accessibility) {
                try {
                    if ($accessibility.props) {
                        const a = new $accessibility.Class(type, $accessibility.props);

                        modifiedProps = { ...modifiedProps, ...a.getAttributes() };
                    } else {
                        patchTabIndex(modifiedProps, false);

                        ($accessibility.Class as any).fromAttributes(type, modifiedProps);
                    }
                } catch (e) {
                    if (__DEV__ && _showRenderErrors) {
                        modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_ID] = DevEnv.reportError(window, e.message, null, true) || '-1';
                        modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_MESSAGE] = e.message;
                    }
                }

                patchTabIndex(modifiedProps, true);

                if (__DEV__) {
                    modifiedProps[DevEnv.ATTRIBUTE_NAME_CLASS] = ($accessibility.Class as any).className;

                    if ($accessibility.props) {
                        modifiedProps[DevEnv.ATTRIBUTE_NAME_PROPS] = JSON.stringify($accessibility.props);
                    }
                }
            } else if (__DEV__ && _showRenderErrors) {
                const msg = 'Invalid $accessibility attribute value, use $A or $AA functions.';

                modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_ID] = DevEnv.reportError(window, msg, null, true) || '-1';
                modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_MESSAGE] = msg;
            }

            arguments[1] = modifiedProps;
        } else {
            let modifiedProps = props || {};

            patchTabIndex(modifiedProps, false);

            if (isAccessibleElement(type, modifiedProps)) {
                if (__DEV__ && _enforceClasses && _showRenderErrors) {
                    const Class = DevEnv.assumeClass(type, modifiedProps, null, true);
                    let msg: string | undefined;

                    if (Class) {
                        try {
                            Class.fromAttributes(type, modifiedProps);
                        } catch (e) {
                            msg = e.message;
                        }
                    } else {
                        msg = 'Accessible element must have accessibility class assigned.';
                    }

                    if (msg) {
                        modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_ID] = DevEnv.reportError(window, msg, null, true) || '-1';
                        modifiedProps[DevEnv.ATTRIBUTE_NAME_ERROR_MESSAGE] = msg;

                        arguments[1] = modifiedProps;
                    }
                }

                patchTabIndex(modifiedProps, true);
            } else if (_enforceRoleNone) {
                arguments[1] = props ? { ...props, role: 'none' } : { role: 'none' };
            }
        }
    }

    return _origCreateElement.apply(this, arguments);
};

function patchTabIndex(props: any, unpatch: boolean): void {
    if (unpatch) {
        if (props.tabindex !== undefined) {
            props.tabIndex = parseInt(props.tabindex, 10);
            delete props.tabindex;
        }
    } else {
        if (props.tabIndex !== undefined) {
            props.tabindex = props.tabIndex + '';
            delete props.tabIndex;
        }
    }
}

export { createElement };

export function setup(win: Window, settings?: Settings) {
    if (__DEV__) {
        DevEnv.setup(win, settings ? settings.enforceClasses !== false : true);

        if (settings) {
            _enforceClasses = settings.enforceClasses !== false;
            _enforceRoleNone = settings.enforceRoleNone !== false;
            _showRenderErrors = settings.showRenderErrors !== false;
        }
    }
}