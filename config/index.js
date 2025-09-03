import configProd from './prod.js'
import configDev from './dev.js'


export var config


if (process.env.NODE_ENV === 'production') {
  console.log(process.env.NODE_ENV);
  config = configProd
} else {
  config = configDev
}
// config.isGuestMode = true
console.log(config);


