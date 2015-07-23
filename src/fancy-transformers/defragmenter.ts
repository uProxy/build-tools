import logging = require('../logging/logging');
import arraybuffers = require('../arraybuffers/arraybuffers');
import Fragment = require('./fragment');

var log :logging.Log = new logging.Log('fancy-transformers');

class Defragmenter {
  private tracker_ : {[index: string]: ArrayBuffer[]}={};
  private counter_ : {[index: string]: number}={};
  private complete_: string[]=[];

  public constructor() {}

  public addFragment(fragment:Fragment) {
    var hexid=arraybuffers.arrayBufferToHexString(fragment.id);
    if(hexid in this.tracker_) { // A fragment for an existing packet
      var fragments : ArrayBuffer[]=this.tracker_[hexid];
      if(fragments[fragment.index]!=null) { // Duplicate fragment
        log.info('Duplicate fragment %1: %2 / %3', hexid, fragment.index, fragment.count);
      } else { // New fragment
        fragments[fragment.index]=fragment.payload;
        this.tracker_[hexid]=fragments;
        this.counter_[hexid]=this.counter_[hexid]-1;
        if(this.counter_[hexid]==0) {
          this.complete_.push(hexid);
        }
      }
    } else { // A fragment for a new packet
      var fragments : ArrayBuffer[]=[];
      for(var i=0; i<fragment.count; i++) {
        fragments.push(null);
      }

      fragments[fragment.index]=fragment.payload;
      this.tracker_[hexid]=fragments;
      this.counter_[hexid]=fragment.count-1;
      if(this.counter_[hexid]==0) {
        this.complete_.push(hexid);
      }
    }
  }

  public completeCount = () : number => {
    return this.complete_.length;
  }

  public getComplete = () : ArrayBuffer[] => {
    if(this.complete_.length > 0) {
      var packets : ArrayBuffer[] = [];
      for(var i=0; i<this.complete_.length; i++) {
        var hexid=this.complete_.pop();
        var fragments=this.tracker_[hexid];
        if(fragments != null && fragments.length > 0) {
          var packet = this.assemble_(fragments);
          packets.push(packet);
        }
      }

      return packets;
    }

    return null;
  }

  private assemble_ = (buffers:ArrayBuffer[]) : ArrayBuffer => {
    var total=0;
    for(var i=0; i<buffers.length; i++) {
      total=total+buffers[i].byteLength;
    }

    var result = new Uint8Array(total);
    var toIndex=0;
    for(var i=0; i<buffers.length; i++) {
      var bytes=new Uint8Array(buffers[i]);
      for(var fromIndex=0; fromIndex<buffers[i].byteLength; fromIndex++) {
        bytes[toIndex]=bytes[fromIndex];
        toIndex=toIndex+1;
      }
    }

    return bytes.buffer;
  }
}

export = Defragmenter;
