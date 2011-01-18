class TracksController < ApplicationController
  
  def index
    sc = current_connection
    @tracks = sc.User.find_me.tracks
    render layout: nil
  end
  
  def show
    @id = params[:id]
    sc = current_connection
    @track = sc.Track.find(@id)
    render layout: nil
  end
end
