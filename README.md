# Columba
## Install
Globally : `sudo npm install -g columba`

Locally :

```
git clone git@github.com:siz-io/columba.git
cd columba
npm install
```

## Use
Globally installed : `columba`

Locally installed : `npm start`

### Parameters
**`Send to`** :
- email addresses file path (drag&drop in terminal) :

  ```
  a@b.com
  c@d.com
  e@f.com
  ...
  ```

- csv file (;-separated) path (drag&drop in terminal):

  ```
  address;param1;param2
  a@b.com;A;B
  c@d.com;C;D
  e@f.com;E;F
  ...
  ```

  `address` column is mandatory. Other columns are used to fill emails

- email address : enter addresses one at a time, enter empty address to stop.

**`Mail config`** : mail config file path (drag&drop in terminal) cf [config sample](config.sample.yml)

## Update
Globally installed : `sudo npm install -g columba`

Locally installed : `git pull`
