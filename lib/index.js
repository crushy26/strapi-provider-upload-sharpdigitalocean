'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-vars */
// Public node modules.
const AWS = require('aws-sdk');
const Sharp = require('sharp');

module.exports = {
  provider: 'digitalocean-sharp',
  name: 'Digitalocean Spaces sharp',
  auth: {
    key: {
      label: 'Key',
      type: 'text'
    },
    secret: {
      label: 'Secret',
      type: 'text'
    },
    region: {
      label: 'Region',
      type: 'enum',
      values: ['nyc3', 'sgp1', 'ams3', 'sfo2']
    },
    space: {
      label: 'Space',
      type: 'text'
    }
  },
  init: config => {
    const S3 = new AWS.S3({
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      sslEnabled: true,
      endpoint: `${config.region}.digitaloceanspaces.com`,
      params: {
        Bucket: config.space
      }
    });

    return {
      upload: file => {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : '';

          Sharp(file.buffer)
            .toFormat('jpeg')
            .jpeg({ quality: 90, progressive: true })
            .resize(1000, 1000)
            .toBuffer()
            .then(buffer => {
              var params = {
                Key: `${path}l_${file.hash}${file.ext}`,
                Body: new Buffer(buffer, 'binary'),
                ACL: 'public-read',
                ContentType: file.mime
              };

              S3.upload(params, (err, data) => {
                if (err) {
                  return reject(err);
                }
                file.url = data.Location;

                //one more time
                Sharp(buffer)
                  .toFormat('jpeg')
                  .jpeg({ quality: 90, progressive: true })
                  .resize(500, 500)
                  .toBuffer()
                  .then(buffer => {
                    var params = {
                      Key: `${path}t_${file.hash}${file.ext}`,
                      Body: new Buffer(buffer, 'binary'),
                      ACL: 'public-read',
                      ContentType: file.mime
                    };

                    S3.upload(params, (err, data) => {
                      if (err) {
                        return reject(err);
                      }
                      file.thumb = data.Location;
                      resolve();
                    });
                  })
                  .catch(err => reject(err));
              });
            })
            .catch(err => reject(err));
        });
      },
      delete: file => {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : '';
          S3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }
              resolve();
            }
          );
        });
      }
    };
  }
};
