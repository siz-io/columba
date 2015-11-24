'use strict'

const fs = require('fs')
const yaml = require('js-yaml')
const handlebars = require('handlebars')
const prompt = require('prompt')
prompt.colors = false
prompt.message = ''
prompt.delimiter = ''
prompt.start()
const CSVConverter = require('csvtojson').Converter
const csvConverter = new CSVConverter({
  delimiter: ';'
})
const _ = require('lodash')
const nodemailer = require('nodemailer')

const input = (message, hidden) => new Promise((res, rej) => prompt.get({
  properties: {
    value: {
      message, hidden
    }
  }
}, (err, result) => err ? rej(err) : res(result.value)))

const getDestinations = () =>
  input('Send to:').then(destination => {
    if (!destination) return []

    destination = destination.trim()

    if (/@/.test(destination)) {
      const mail = [{
        address: destination
      }]
      return getDestinations().then(mail.concat.bind(mail))
    }

    if (/\.csv$/.test(destination)) {
      return new Promise((res, rej) => csvConverter.fromString(fs.readFileSync(destination, 'utf8'), (err, result) => err ? rej(err) : res(result)))
    }

    return _.compact(fs.readFileSync(destination, 'utf8').split('\n'))
      .map(address => {
        return {
          address
        }
      })
  })

const loadMailConfig = () => input('Mail config:').then(configPath => yaml.safeLoad(fs.readFileSync(configPath.trim(), 'utf8')))

const findTemplateKeys = template => {
  const keys = []
  const keyFinder = /{{([a-z0-9_]+)}}/ig
  let match = '-'
  while ((match = keyFinder.exec(template)) !== null) {
    keys.push(match[1])
  }
  return keys
}

const inputKeys = keys => {
  if (keys.length === 0) return Promise.resolve({})
  return input(keys[0] + ' :')
    .then(value => inputKeys(keys.slice(1))
      .then(values => _.set(values, keys[0], value)))
}

const sendMail = (mailConfig, destination) => new Promise((res, rej) => {
  const mailOptions = {}
  mailOptions.from = mailConfig.mail.from
  mailOptions.to = destination.address
  mailOptions.subject = mailConfig.mail.compiledSubject(destination)
  mailOptions[mailConfig.mail.html ? 'html' : 'text'] = mailConfig.mail.compiledBody(destination)
  mailConfig.mailSender.transporter.sendMail(mailOptions, (err, info) => err ? rej(err) : res(info))
})

const sendAllMail = (mailConfig, destinations) => {
  if (destinations.length === 0) return Promise.resolve()
  return sendMail(mailConfig, destinations[0]).then(() => {
    console.log('Sent mail to', destinations[0].address)
    sendAllMail(mailConfig, destinations.slice(1))
  })
}

loadMailConfig()
  .then(mailConfig => {
    mailConfig.mailSender.auth = mailConfig.mailSender.auth || {}
    if (!mailConfig.mailSender.auth.user) return input(mailConfig.mailSender.service + ' user :')
      .then(user => {
        mailConfig.mailSender.auth.user = user
        return mailConfig
      })
    return mailConfig
  })
  .then(mailConfig => {
    if (!mailConfig.mailSender.auth.pass) return input(mailConfig.mailSender.service + ' pass :', true)
      .then(pass => {
        mailConfig.mailSender.auth.pass = pass
        return mailConfig
      })
    return mailConfig
  })
  .then(mailConfig => {
    mailConfig.mailSender.transporter = nodemailer.createTransport(mailConfig.mailSender)
    mailConfig.mail.compiledBody = handlebars.compile(mailConfig.mail.body)
    mailConfig.mail.compiledSubject = handlebars.compile(mailConfig.mail.subject)
    return mailConfig
  })
  .then(mailConfig => getDestinations()
    .then(destinations => inputKeys(_.difference(findTemplateKeys(mailConfig.mail.subject + mailConfig.mail.body), Object.keys(destinations[0])))
      .then(missingKeys => destinations.forEach(destination => _.assign(destination, missingKeys)))
      .then(() => sendAllMail(mailConfig, destinations))
      .then(() => console.log('Done.')).catch(err => console.log(err.stack)))
  )
